import asyncio
import json
import time
import uuid
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.engine.models import (
    TouristProfile,
    TouristGPSUpdate,
    Incident,
    ResponseUnit,
    Geofence,
    Coordinates
)
from app.engine.simulation import SimulationEngine
from app.engine.scenarios import TrekkingScenarioRunner

app = FastAPI(
    title="Smart Tourist Safety Platform API",
    description="Backend API and WebSocket stream for Tourist Safety & Response System",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared global simulation engine and scenario runner instances
sim_engine = SimulationEngine(seed=42)
trekking_runner = TrekkingScenarioRunner(sim_engine=sim_engine, tourist_id="T-101")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

ws_manager = ConnectionManager()

def build_state_payload(event_name: str = "SIMULATION_TICK") -> Dict[str, Any]:
    """Build complete synchronized state snapshot."""
    return {
        "event": event_name,
        "sim_time": sim_engine.sim_time,
        "is_paused": sim_engine.is_paused,
        "speed_multiplier": sim_engine.speed_multiplier,
        "tourists": [t.model_dump() for t in sim_engine.tourists.values()],
        "incidents": [i.model_dump() for i in sim_engine.store.list_incidents()],
        "response_units": [u.model_dump() for u in sim_engine.store.list_response_units()],
        "geofences": [g.model_dump() for g in sim_engine.geofences],
        "stats": {
            "total_tourists": len(sim_engine.tourists),
            "high_critical_risk_count": sum(1 for t in sim_engine.tourists.values() if t.risk_level in ["HIGH", "CRITICAL"]),
            "open_incidents_count": sum(1 for i in sim_engine.store.list_incidents() if i.status not in ["RESOLVED", "FALSE_ALARM"]),
            "available_units_count": sum(1 for u in sim_engine.store.list_response_units() if u.status == "AVAILABLE")
        },
        "trekking_scenario": trekking_runner.get_state()
    }

async def broadcast_now():
    """Immediately push latest state to all connected WebSocket clients."""
    await ws_manager.broadcast(build_state_payload("SIMULATION_TICK"))

# Background simulation runner task
sim_task: Optional[asyncio.Task] = None

async def simulation_loop():
    """Background ticker advancing simulation state and broadcasting live events."""
    while True:
        try:
            if not sim_engine.is_paused:
                sim_engine.step(delta_seconds=2.0)
            # Always broadcast current state so UI stays responsive even when paused
            await broadcast_now()
            await asyncio.sleep(1.0)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Error in simulation_loop]: {e}")
            await asyncio.sleep(1.0)

@app.on_event("startup")
async def startup_event():
    global sim_task
    sim_task = asyncio.create_task(simulation_loop())

@app.on_event("shutdown")
async def shutdown_event():
    global sim_task
    if sim_task:
        sim_task.cancel()

# --- REST API Endpoints ---

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "sim_time": sim_engine.sim_time}

@app.get("/api/state")
def get_full_state():
    """Fallback HTTP endpoint returning complete state snapshot."""
    return build_state_payload("STATE_SNAPSHOT")

@app.get("/api/tourists", response_model=List[TouristProfile])
def list_tourists():
    return list(sim_engine.tourists.values())

@app.get("/api/tourists/{tourist_id}", response_model=TouristProfile)
def get_tourist(tourist_id: str):
    t = sim_engine.tourists.get(tourist_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tourist not found")
    return t

@app.get("/api/geofences", response_model=List[Geofence])
def list_geofences():
    return sim_engine.geofences

@app.post("/api/geofences", response_model=Geofence)
def create_custom_geofence(gf_data: Geofence):
    """Create or update a custom geofence perimeter."""
    if not gf_data.id or gf_data.id.strip() == "":
        gf_data.id = f"gf_custom_{uuid.uuid4().hex[:8]}"

    if gf_data.type == "circle":
        if not gf_data.center or gf_data.center.lat is None or gf_data.center.lon is None:
            raise HTTPException(status_code=400, detail="Circle geofence requires a valid center coordinate (lat, lon)")
        if not gf_data.radius_meters or gf_data.radius_meters <= 0:
            raise HTTPException(status_code=400, detail="Circle geofence requires radius_meters > 0")
    elif gf_data.type == "polygon":
        if not gf_data.polygon_points or len(gf_data.polygon_points) < 3:
            raise HTTPException(status_code=400, detail="Polygon geofence requires at least 3 boundary vertices")

    created = sim_engine.add_geofence(gf_data)
    return created

@app.delete("/api/geofences/{geofence_id}")
def delete_geofence(geofence_id: str):
    """Remove a custom or existing geofence perimeter."""
    success = sim_engine.delete_geofence(geofence_id)
    if not success:
        raise HTTPException(status_code=404, detail="Geofence not found")
    return {"deleted": True, "geofence_id": geofence_id}

@app.post("/api/geofences/reset", response_model=List[Geofence])
def reset_geofences():
    """Reset geofences to initial system defaults."""
    return sim_engine.reset_geofences()

@app.get("/api/response-units", response_model=List[ResponseUnit])
def list_response_units():
    return sim_engine.store.list_response_units()

@app.get("/api/incidents", response_model=List[Incident])
def list_incidents(status: Optional[str] = Query(None)):
    return sim_engine.store.list_incidents(status=status)

@app.get("/api/incidents/{incident_id}", response_model=Incident)
def get_incident(incident_id: str):
    inc = sim_engine.store.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc

@app.get("/api/incidents/{incident_id}/recommended-units")
def get_recommended_units(incident_id: str):
    try:
        units = sim_engine.workflow.get_recommended_units(incident_id)
        return [{
            "unit": item["unit"].model_dump(),
            "distance_meters": item["distance_meters"],
            "distance_km": item["distance_km"],
            "is_available": item["is_available"]
        } for item in units]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

class ActionRequest(BaseModel):
    officer_id: str = "OFFICER-HQ-01"
    note: Optional[str] = ""

class AssignRequest(BaseModel):
    officer_id: str = "OFFICER-HQ-01"
    unit_id: str

class DispatchRequest(BaseModel):
    officer_id: str = "OFFICER-HQ-01"
    eta_minutes: int = 15

class ResolveRequest(BaseModel):
    officer_id: str = "OFFICER-HQ-01"
    summary: str

class FalseAlarmRequest(BaseModel):
    officer_id: str = "OFFICER-HQ-01"
    reason: str

@app.post("/api/incidents/{incident_id}/acknowledge")
async def acknowledge_incident(incident_id: str, req: ActionRequest):
    try:
        existing = sim_engine.store.get_incident(incident_id)
        if existing and existing.status != "NEW":
            # Idempotent return if already acknowledged
            await broadcast_now()
            return existing
        inc = sim_engine.workflow.acknowledge_incident(incident_id, req.officer_id, req.note)
        await broadcast_now()
        return inc
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/incidents/{incident_id}/assign")
async def assign_unit(incident_id: str, req: AssignRequest):
    try:
        inc = sim_engine.workflow.assign_response_unit(incident_id, req.unit_id, req.officer_id)
        await broadcast_now()
        return inc
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/incidents/{incident_id}/dispatch")
async def dispatch_unit(incident_id: str, req: DispatchRequest):
    try:
        inc = sim_engine.workflow.dispatch_unit_responding(incident_id, req.officer_id, req.eta_minutes)
        await broadcast_now()
        return inc
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/incidents/{incident_id}/resolve")
async def resolve_incident(incident_id: str, req: ResolveRequest):
    try:
        inc = sim_engine.workflow.resolve_incident(incident_id, req.officer_id, req.summary)
        # Also clear tourist emergency mode if resolved
        tid = inc.tourist_id
        if tid in sim_engine.tourists:
            sim_engine.tourist_modes[tid] = "normal"
            sim_engine.tourists[tid].risk_score = 0.0
            sim_engine.tourists[tid].risk_level = "LOW"
            sim_engine.tourists[tid].last_assessment_reason = "Incident resolved by command center"
        await broadcast_now()
        return inc
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/incidents/{incident_id}/false-alarm")
async def mark_false_alarm(incident_id: str, req: FalseAlarmRequest):
    try:
        inc = sim_engine.workflow.mark_false_alarm(incident_id, req.officer_id, req.reason)
        tid = inc.tourist_id
        if tid in sim_engine.tourists:
            sim_engine.tourist_modes[tid] = "normal"
            sim_engine.tourists[tid].risk_score = 0.0
            sim_engine.tourists[tid].risk_level = "LOW"
            sim_engine.tourists[tid].last_assessment_reason = "Classified as False Alarm"
        await broadcast_now()
        return inc
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

class TransmitGuidanceRequest(BaseModel):
    officer_id: str = "OFFICER-SATARA-HQ"
    guidance_message: str

@app.post("/api/incidents/{incident_id}/transmit-guidance")
async def transmit_guidance(incident_id: str, req: TransmitGuidanceRequest):
    inc = sim_engine.store.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    ts = sim_engine.sim_time
    if inc.status == "NEW":
        inc.status = "ACKNOWLEDGED"
    inc.updated_at = ts

    if not inc.evidence_breakdown:
        inc.evidence_breakdown = {}
    inc.evidence_breakdown["advisory_response"] = req.guidance_message
    inc.evidence_breakdown["advisory_timestamp"] = ts
    inc.evidence_breakdown["advisory_officer"] = req.officer_id

    inc.notes.append(f"[{req.officer_id} -> TOURIST ADVISORY]: {req.guidance_message}")
    inc.timeline.append({
        "timestamp": ts,
        "action": "GUIDANCE_ADVISORY_TRANSMITTED",
        "actor": req.officer_id,
        "from_status": inc.status,
        "to_status": inc.status,
        "reason": req.guidance_message
    })
    sim_engine.store.save_incident(inc)

    tid = inc.tourist_id
    if tid in sim_engine.tourists:
        sim_engine.tourists[tid].last_assessment_reason = f"Advisory Received from {req.officer_id}: '{req.guidance_message}'"

    await broadcast_now()
    return inc

# Simulation Controls
class SimControlRequest(BaseModel):
    action: str # "pause", "resume", "step", "reset", "set_speed"
    speed: Optional[float] = 1.0

@app.post("/api/simulation/control")
async def control_simulation(req: SimControlRequest):
    global sim_engine, trekking_runner
    if req.action == "pause":
        sim_engine.is_paused = True
    elif req.action == "resume":
        sim_engine.is_paused = False
    elif req.action == "step":
        sim_engine.step(delta_seconds=5.0)
    elif req.action == "set_speed":
        if req.speed and req.speed > 0:
            sim_engine.speed_multiplier = req.speed
    elif req.action == "reset":
        sim_engine.store.clear_all()
        sim_engine = SimulationEngine(seed=42)
        trekking_runner = TrekkingScenarioRunner(sim_engine=sim_engine, tourist_id="T-101")
    await broadcast_now()
    return {
        "status": "success",
        "is_paused": sim_engine.is_paused,
        "speed_multiplier": sim_engine.speed_multiplier,
        "sim_time": sim_engine.sim_time
    }

# Scenarios Controller
class ScenarioRequest(BaseModel):
    scenario_name: str # "trekking_escalation", "false_alarm_cafe", "sos_immediate", "signal_loss", "crowd_surge"
    tourist_id: Optional[str] = "T-101"

@app.post("/api/simulation/scenarios/run")
async def trigger_scenario(req: ScenarioRequest):
    tid = req.tourist_id or "T-101"
    if tid not in sim_engine.tourists and req.scenario_name != "crowd_surge":
        raise HTTPException(status_code=404, detail="Tourist not found")

    if req.scenario_name == "trekking_escalation":
        trekking_runner.sim = sim_engine
        trekking_runner.set_stage(5)
    elif req.scenario_name == "false_alarm_cafe":
        sim_engine.tourist_modes[tid] = "stopped"
        sim_engine.step(1080.0)
    elif req.scenario_name == "sos_immediate":
        sim_engine.tourist_modes[tid] = "sos"
        sim_engine.step(5.0)
    elif req.scenario_name == "signal_loss":
        sim_engine.tourist_modes[tid] = "lost_signal"
        sim_engine.sim_time += 360.0
        tourist = sim_engine.tourists[tid]
        evidence = sim_engine.detector.evaluate_telemetry(
            tourist,
            TouristGPSUpdate(
                tourist_id=tid,
                lat=tourist.current_location.lat if tourist.current_location else 0,
                lon=tourist.current_location.lon if tourist.current_location else 0,
                timestamp=tourist.last_update_timestamp,
                speed_kmh=0.0
            ),
            sim_engine.geofences,
            sim_engine.sim_time
        )
        score, level, reason, factors = sim_engine.risk_engine.evaluate_risk(evidence, tourist)
        tourist.risk_score = score
        tourist.risk_level = level
        tourist.last_assessment_reason = reason
        tourist.is_signal_lost = True
        tourist.signal_delay_seconds = evidence["signal_delay_seconds"]
        sim_engine.workflow.process_telemetry_risk(tourist, evidence, score, level, reason, sim_engine.sim_time)
    elif req.scenario_name == "crowd_surge":
        for gf in sim_engine.geofences:
            if gf.id == "gf_crowd_mall_road":
                gf.crowd_density = 0.92
                gf.description = "CRITICAL CROWD CONGESTION: Exceeded 90% threshold at Bamnoli Boat Jetty"
                crowd_inc = Incident(
                    incident_id=f"INC-CROWD-BAMNOLI-{int(sim_engine.sim_time)}",
                    tourist_id="ZONE-BAMNOLI-JETTY",
                    tourist_name="Bamnoli Boat Jetty Hub",
                    type="CROWD_SURGE",
                    severity="HIGH",
                    risk_score=78.0,
                    status="NEW",
                    location=gf.center or Coordinates(lat=17.7270, lon=73.7460),
                    created_at=sim_engine.sim_time,
                    updated_at=sim_engine.sim_time,
                    evidence_breakdown={
                        "zone_name": gf.name,
                        "crowd_density": 0.92,
                        "threshold": 0.80,
                        "risk_level": "HIGH",
                        "recommended_actions": [
                            "Hold departing tourist boats at Bamnoli staging point",
                            "Deploy Forest Guard crowd marshals at permit counters",
                            "Broadcast advisory alert to tourist mobile companions"
                        ]
                    },
                    notes=["Automated crowd intelligence alert: density exceeded 90% capacity at boat boarding dock."],
                    timeline=[{
                        "timestamp": sim_engine.sim_time,
                        "action": "CROWD_SURGE_DETECTED",
                        "actor": "CROWD_ENGINE",
                        "from_status": None,
                        "to_status": "NEW",
                        "severity": "HIGH",
                        "risk_score": 78.0,
                        "reason": "Crowd density reached 0.92 (Threshold: 0.80)"
                    }]
                )
                sim_engine.store.save_incident(crowd_inc)
                break
    else:
        raise HTTPException(status_code=400, detail=f"Unknown scenario {req.scenario_name}")

    await broadcast_now()
    return {
        "status": "scenario_applied",
        "scenario": req.scenario_name,
        "tourist_id": tid,
        "tourist_risk_score": sim_engine.tourists[tid].risk_score if tid in sim_engine.tourists else 78.0,
        "tourist_risk_level": sim_engine.tourists[tid].risk_level if tid in sim_engine.tourists else "HIGH",
        "active_incidents": len(sim_engine.store.list_incidents())
    }

class TrekkingStageRequest(BaseModel):
    action: str # "next", "reset", "set_stage"
    stage: Optional[int] = 1

@app.post("/api/simulation/scenarios/trekking/stage")
async def control_trekking_stage(req: TrekkingStageRequest):
    trekking_runner.sim = sim_engine
    if req.action == "next":
        res = trekking_runner.advance()
    elif req.action == "reset":
        res = trekking_runner.reset()
    elif req.action == "set_stage":
        res = trekking_runner.set_stage(req.stage or 1)
    else:
        res = trekking_runner.get_state()
    await broadcast_now()
    return res

@app.get("/api/simulation/scenarios/trekking/state")
def get_trekking_stage_state():
    return trekking_runner.get_state()

class SafetyCheckRequest(BaseModel):
    is_safe: bool = True
    message: Optional[str] = "Tourist responded: I am fine."

@app.post("/api/tourists/{tourist_id}/safety-check")
async def tourist_safety_check(tourist_id: str, req: SafetyCheckRequest):
    tourist = sim_engine.tourists.get(tourist_id)
    if not tourist:
        raise HTTPException(status_code=404, detail="Tourist not found")

    if req.is_safe:
        sim_engine.tourist_modes[tourist_id] = "normal"
        tourist.last_movement_timestamp = sim_engine.sim_time
        tourist.inactivity_minutes = 0.0
        tourist.risk_score = 0.0
        tourist.risk_level = "LOW"
        tourist.last_assessment_reason = f"Safety check confirmed safe by tourist: '{req.message}'"

        # Also auto-resolve any active ASSISTANCE_REQUEST for this tourist
        for inc in sim_engine.store.list_incidents():
            if inc.tourist_id == tourist_id and inc.type == "ASSISTANCE_REQUEST" and inc.status not in ["RESOLVED", "FALSE_ALARM"]:
                try:
                    sim_engine.workflow.resolve_incident(inc.incident_id, "TOURIST_COMPANION", f"Tourist confirmed safe on trail: {req.message}")
                except Exception:
                    pass
        await broadcast_now()
        return {"status": "safety_check_acknowledged", "tourist_id": tourist_id, "risk_level": tourist.risk_level, "risk_score": tourist.risk_score}
    else:
        # Tourist requested guidance / assistance:
        # Set persistent guidance mode so simulation retains medium risk and stationary hold
        sim_engine.tourist_modes[tourist_id] = "guidance"
        tourist.risk_score = 45.0
        tourist.risk_level = "MEDIUM"
        msg = req.message or "Need route guidance near Vasota Fort trail"
        tourist.last_assessment_reason = f"Guidance Requested: '{msg}' — Advisory assistance ticket dispatched"

        # Check if active guidance incident already exists for this tourist
        active_guide_inc = None
        for inc in sim_engine.store.list_incidents():
            if inc.tourist_id == tourist_id and inc.status not in ["RESOLVED", "FALSE_ALARM"]:
                if inc.type == "ASSISTANCE_REQUEST":
                    active_guide_inc = inc
                    break

        res_incident_id = ""
        if active_guide_inc:
            active_guide_inc.updated_at = sim_engine.sim_time
            if tourist.current_location:
                active_guide_inc.location = tourist.current_location
            if not active_guide_inc.evidence_breakdown:
                active_guide_inc.evidence_breakdown = {}
            active_guide_inc.evidence_breakdown["request_type"] = "TRAIL_GUIDANCE"
            active_guide_inc.evidence_breakdown["tourist_message"] = msg
            active_guide_inc.evidence_breakdown["risk_level"] = "MEDIUM"
            active_guide_inc.notes.append(f"[TOURIST GUIDANCE REQUEST]: {msg}")
            active_guide_inc.timeline.append({
                "timestamp": sim_engine.sim_time,
                "action": "GUIDANCE_REQUESTED",
                "actor": "TOURIST_COMPANION",
                "from_status": active_guide_inc.status,
                "to_status": active_guide_inc.status,
                "severity": "MEDIUM",
                "risk_score": 45.0,
                "reason": msg
            })
            sim_engine.store.save_incident(active_guide_inc)
            res_incident_id = active_guide_inc.incident_id
        else:
            guidance_inc = Incident(
                incident_id=f"INC-GUIDE-{tourist_id}-{int(sim_engine.sim_time)}",
                tourist_id=tourist_id,
                tourist_name=tourist.name,
                type="ASSISTANCE_REQUEST",
                severity="MEDIUM",
                risk_score=45.0,
                status="NEW",
                location=tourist.current_location or Coordinates(lat=17.6717, lon=73.7172),
                created_at=sim_engine.sim_time,
                updated_at=sim_engine.sim_time,
                evidence_breakdown={
                    "request_type": "TRAIL_GUIDANCE",
                    "tourist_message": msg,
                    "inactivity_minutes": tourist.inactivity_minutes,
                    "deviation_meters": tourist.current_route_deviation_meters,
                    "risk_level": "MEDIUM",
                    "recommended_actions": [
                        "Transmit trail waypoint guidance to tourist device",
                        "Radio nearest forest guard squad for advisory check"
                    ]
                },
                notes=[f"[TOURIST APP GUIDANCE REQUEST]: {msg}"],
                timeline=[{
                    "timestamp": sim_engine.sim_time,
                    "action": "GUIDANCE_REQUESTED",
                    "actor": "TOURIST_COMPANION",
                    "from_status": None,
                    "to_status": "NEW",
                    "severity": "MEDIUM",
                    "risk_score": 45.0,
                    "reason": f"Tourist tapped Need Guidance: {msg}"
                }]
            )
            sim_engine.store.save_incident(guidance_inc)
            res_incident_id = guidance_inc.incident_id

        await broadcast_now()
        return {
            "status": "guidance_requested",
            "tourist_id": tourist_id,
            "risk_level": "MEDIUM",
            "risk_score": 45.0,
            "incident_id": res_incident_id
        }

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        await websocket.send_json(build_state_payload("INIT_STATE"))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
