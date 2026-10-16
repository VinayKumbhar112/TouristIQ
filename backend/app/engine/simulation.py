import time
import math
import random
from typing import List, Dict, Any, Optional, Tuple
from app.engine.models import (
    TouristProfile,
    TouristGPSUpdate,
    PlannedRoute,
    Coordinates,
    Geofence,
    Incident,
    ResponseUnit
)
from app.engine.geo import haversine_distance
from app.engine.detector import AnomalyDetector
from app.engine.risk_engine import ContextualRiskEngine
from app.engine.workflow import ResponseWorkflowManager
from app.engine.store import IncidentStore

# Coordinates seeded in Vasota Fort Trek / Koyna Wildlife Sanctuary / Bamnoli Corridor
# Met Indavali (Trailhead): 17.6717, 73.7172 | Vasota Fort (Vyaghragad): 17.6633, 73.6969
BASE_LAT = 17.6717
BASE_LON = 73.7172

DEFAULT_GEOFENCES: List[Geofence] = [
    Geofence(
        id="gf_forest_danger",
        name="Dense Forest & Wildlife Zone (Vasota Core)",
        type="polygon",
        category="danger",
        polygon_points=[
            Coordinates(lat=17.6680, lon=73.6980),
            Coordinates(lat=17.6750, lon=73.6950),
            Coordinates(lat=17.6780, lon=73.7100),
            Coordinates(lat=17.6650, lon=73.7080),
        ],
        description="Hazardous dense Sahyadri forest core prone to wildlife encounters and flash landslides",
        weather_hazard="heavy_rain"
    ),
    Geofence(
        id="gf_river_caution",
        name="Shivsagar Lake Backwaters Buffer",
        type="circle",
        category="caution",
        center=Coordinates(lat=17.6740, lon=73.7230),
        radius_meters=350.0,
        description="Koyna backwater rapid level fluctuation and slippery landing bank"
    ),
    Geofence(
        id="gf_military_restricted",
        name="Bamnoli Forest Checkpost Buffer",
        type="circle",
        category="restricted",
        center=Coordinates(lat=17.7260, lon=73.7480),
        radius_meters=500.0,
        description="Sahyadri Tiger Reserve restricted checkpoint zone"
    ),
    # Realistic tourist and pilgrim crowd zones in Satara - Koyna corridor
    Geofence(
        id="gf_crowd_mall_road",
        name="Bamnoli Boat Jetty Hub",
        type="circle",
        category="crowd",
        center=Coordinates(lat=17.7270, lon=73.7460),
        radius_meters=280.0,
        description="High-footfall boat boarding jetty and tourist briefing promenade",
        crowd_density=0.45
    ),
    Geofence(
        id="gf_crowd_temple_promenade",
        name="Met Indavali Base Camp Ground",
        type="circle",
        category="crowd",
        center=Coordinates(lat=17.6715, lon=73.7165),
        radius_meters=320.0,
        description="Trek staging point, forest permit verification and assembly area",
        crowd_density=0.35
    ),
    Geofence(
        id="gf_crowd_solang_cable_car",
        name="Vasota Fort Citadel & Machi Summit",
        type="circle",
        category="crowd",
        center=Coordinates(lat=17.6633, lon=73.6969),
        radius_meters=350.0,
        description="Vyaghragad top viewpoint, Babu Kada cliff and bastion assembly",
        crowd_density=0.50
    )
]

def generate_route_waypoints(start: Tuple[float, float], end: Tuple[float, float], num_points: int = 15) -> List[Coordinates]:
    """Generate intermediate smooth waypoints along a path."""
    pts = []
    lat1, lon1 = start
    lat2, lon2 = end
    for i in range(num_points):
        frac = i / (num_points - 1)
        # Add slight natural curve
        curve = math.sin(frac * math.pi) * 0.003
        pts.append(Coordinates(
            lat=round(lat1 + (lat2 - lat1) * frac + curve, 6),
            lon=round(lon1 + (lon2 - lon1) * frac, 6)
        ))
    return pts

class SimulationEngine:
    """
    Simulates real-time telemetry streams for tourists, response units, and environmental conditions.
    Supports stepping, custom speed, pausing, and reproducible scenario execution.
    """

    def __init__(self, seed: int = 42):
        self.seed = seed
        random.seed(seed)
        self.sim_time = time.time()
        self.speed_multiplier = 1.0
        self.is_paused = False
        
        self.detector = AnomalyDetector()
        self.risk_engine = ContextualRiskEngine()
        self.store = IncidentStore()
        self.workflow = ResponseWorkflowManager(store=self.store)
        
        self.geofences: List[Geofence] = list(DEFAULT_GEOFENCES)
        self.tourists: Dict[str, TouristProfile] = {}
        self.tourist_progress: Dict[str, float] = {} # fractional route progress [0.0, 1.0]
        self.tourist_modes: Dict[str, str] = {} # "normal", "deviating", "stopped", "lost_signal", "sos"

        
        self._initialize_seed_tourists()

    def _initialize_seed_tourists(self):
        """Create 20 realistic tourist personas with assigned routes."""
        personas = [
            ("T-101", "Aarav Sharma", "Indian", 28, "trekker", "+91-9876543210"),
            ("T-102", "Elena Rostova", "German", 34, "explorer", "+49-1512345678"),
            ("T-103", "Rajesh & Sunita Patel", "Indian", 48, "family", "+91-9822011223"),
            ("T-104", "Marcus Vance", "British", 25, "trekker", "+44-7700900123"),
            ("T-105", "Priya Nair", "Indian", 29, "casual", "+91-9447123456"),
            ("T-106", "Kenji Sato", "Japanese", 31, "explorer", "+81-9012345678"),
            ("T-107", "David Miller", "American", 42, "trekker", "+1-4155552671"),
            ("T-108", "Ananya Deshmukh", "Indian", 24, "casual", "+91-9765432109"),
            ("T-109", "Sophie Laurent", "French", 30, "explorer", "+33-612345678"),
            ("T-110", "Vikram Singh", "Indian", 36, "trekker", "+91-9811223344"),
            ("T-111", "Chloe Martin", "Canadian", 27, "trekker", "+1-6045550192"),
            ("T-112", "Amit & Meera Roy", "Indian", 45, "family", "+91-9830112233"),
            ("T-113", "Lukas Weber", "Austrian", 38, "trekker", "+43-6641234567"),
            ("T-114", "Deepak Verma", "Indian", 32, "casual", "+91-9988776655"),
            ("T-115", "Isabella Rossi", "Italian", 26, "explorer", "+39-3401234567"),
            ("T-116", "Siddharth Joshi", "Indian", 31, "trekker", "+91-9723456789"),
            ("T-117", "Hannah Berg", "Swedish", 29, "trekker", "+46-701234567"),
            ("T-118", "Rohan Gupta", "Indian", 23, "casual", "+91-9654321987"),
            ("T-119", "Carlos Mendoza", "Spanish", 35, "explorer", "+34-600123456"),
            ("T-120", "Zoya Khan", "Indian", 27, "trekker", "+91-9871122334")
        ]

        for i, (tid, name, nat, age, persona, contact) in enumerate(personas):
            # Generate planned trail route from Met Indavali towards Vasota Fort
            route_start = (BASE_LAT + (i % 3) * 0.0015, BASE_LON - (i % 3) * 0.0012)
            route_end = (17.6633 + (i % 3) * 0.0010, 73.6969 + (i % 3) * 0.0010)
            pts = generate_route_waypoints(route_start, route_end, num_points=20)
            
            planned_route = PlannedRoute(
                route_id=f"route_{tid}",
                name=f"Vasota Jungle Trail {chr(65 + i % 6)}",
                points=pts,
                expected_duration_minutes=180
            )

            # Start at initial waypoint
            init_loc = pts[0]
            tourist = TouristProfile(
                tourist_id=tid,
                name=name,
                nationality=nat,
                age=age,
                persona_type=persona,
                emergency_contact=contact,
                digital_id_hash=f"0x89f{i:02x}a17c2f{hash(tid)%1000000:x}",
                consent_given=True,
                planned_route=planned_route,
                current_location=init_loc,
                previous_location=init_loc,
                last_movement_timestamp=self.sim_time,
                last_update_timestamp=self.sim_time,
                risk_level="LOW",
                risk_score=0.0
            )
            self.tourists[tid] = tourist
            self.tourist_progress[tid] = (i * 0.04) % 0.8 # staggered start progress
            self.tourist_modes[tid] = "normal"

    def step(self, delta_seconds: float = 5.0) -> Dict[str, Any]:
        """
        Advance simulation by delta_seconds * speed_multiplier.
        Computes new coordinates, detects anomalies, assesses risk, and updates incidents.
        """
        if self.is_paused:
            return {"status": "paused", "sim_time": self.sim_time}

        effective_delta = delta_seconds * self.speed_multiplier
        self.sim_time += effective_delta

        updates = []
        for tid, tourist in self.tourists.items():
            mode = self.tourist_modes.get(tid, "normal")
            route = tourist.planned_route.points
            
            # Compute position based on mode
            if mode == "stopped" or mode == "guidance":
                # Tourist stationary (e.g., resting, restaurant, or paused awaiting trail guidance)
                curr_loc = tourist.current_location or (route[0] if route else Coordinates(lat=17.6717, lon=73.7172))
                speed = 0.0
            elif mode == "lost_signal":
                # Do not emit telemetry; time advances causing staleness
                continue
            elif mode == "deviating":
                # Moving away from route toward dense Koyna forest danger zone
                progress = self.tourist_progress[tid]
                idx = min(int(progress * (len(route) - 1)), len(route) - 1)
                base_pt = route[idx]
                # Off-path offset directly into danger geofence zone (17.6710, 73.7020)
                curr_loc = Coordinates(
                    lat=17.6710,
                    lon=73.7020
                )
                speed = 2.5
            else: # normal
                prog = self.tourist_progress[tid] + (0.008 * (effective_delta / 5.0))
                if prog >= 1.0:
                    prog = 0.02 # Cycle back to trailhead for continuous lively simulation
                self.tourist_progress[tid] = prog
                
                # Smooth continuous linear interpolation between waypoints
                if len(route) > 1:
                    float_idx = prog * (len(route) - 1)
                    i1 = int(float_idx)
                    i2 = min(i1 + 1, len(route) - 1)
                    ratio = float_idx - i1
                    p1 = route[i1]
                    p2 = route[i2]
                    curr_loc = Coordinates(
                        lat=round(p1.lat + (p2.lat - p1.lat) * ratio, 6),
                        lon=round(p1.lon + (p2.lon - p1.lon) * ratio, 6)
                    )
                else:
                    curr_loc = route[0] if route else Coordinates(lat=17.6717, lon=73.7172)
                speed = 4.2

            gps = TouristGPSUpdate(
                tourist_id=tid,
                lat=curr_loc.lat,
                lon=curr_loc.lon,
                speed_kmh=speed,
                timestamp=self.sim_time,
                is_sos_pressed=(mode == "sos"),
                accuracy_meters=4.5
            )

            # Evaluate telemetry
            evidence = self.detector.evaluate_telemetry(tourist, gps, self.geofences, self.sim_time)
            score, level, reason, factors = self.risk_engine.evaluate_risk(evidence, tourist)

            # Preserve guidance state if active
            if mode == "guidance":
                score = max(score, 45.0)
                if score < 75.0:
                    level = "MEDIUM"
                reason = tourist.last_assessment_reason or "Assistance Requested: Awaiting trail advisory from Satara Control"

            # Update tourist profile
            tourist.previous_location = tourist.current_location
            tourist.current_location = curr_loc
            tourist.last_update_timestamp = gps.timestamp
            if evidence["inactivity_minutes"] == 0.0:
                tourist.last_movement_timestamp = gps.timestamp
            tourist.inactivity_minutes = evidence["inactivity_minutes"]
            tourist.current_route_deviation_meters = evidence["route_deviation_meters"]
            tourist.current_geofences = evidence["active_geofences"]
            tourist.risk_score = score
            tourist.risk_level = level
            tourist.last_assessment_reason = reason
            tourist.risk_factors = factors

            # Incident management via persistent ResponseWorkflowManager
            self.workflow.process_telemetry_risk(
                tourist=tourist,
                evidence=evidence,
                score=score,
                level=level,
                reason=reason,
                current_time=self.sim_time
            )

            updates.append({
                "tourist_id": tid,
                "lat": curr_loc.lat,
                "lon": curr_loc.lon,
                "risk_score": score,
                "risk_level": level,
                "reason": reason
            })

        active_incidents = [i for i in self.store.list_incidents() if i.status not in ["RESOLVED", "FALSE_ALARM"]]

        return {
            "sim_time": self.sim_time,
            "processed_tourists": len(updates),
            "active_incidents": len(active_incidents),
            "updates": updates
        }

    @property
    def incidents(self) -> Dict[str, Incident]:
        """Backward compatibility helper returning current incident map."""
        return {i.tourist_id: i for i in self.store.list_incidents()}


    def _handle_incident_lifecycle(
        self,
        tourist: TouristProfile,
        evidence: Dict[str, Any],
        score: float,
        level: str,
        reason: str
    ):
        """Deduplicate, escalate, or spawn incidents."""
        tid = tourist.tourist_id
        existing_inc = self.incidents.get(tid)

        if level in ["HIGH", "CRITICAL"]:
            inc_type = "SOS_EMERGENCY" if evidence.get("is_sos") else "MULTI_FACTOR_RISK"
            if existing_inc is None:
                # Create new incident
                self.incidents[tid] = Incident(
                    incident_id=f"INC-{tid}-{int(self.sim_time)}",
                    tourist_id=tid,
                    tourist_name=tourist.name,
                    type=inc_type,
                    severity=level,
                    risk_score=score,
                    status="NEW",
                    location=tourist.current_location,
                    created_at=self.sim_time,
                    updated_at=self.sim_time,
                    evidence_breakdown=evidence,
                    timeline=[{
                        "timestamp": self.sim_time,
                        "action": "INCIDENT_TRIGGERED",
                        "severity": level,
                        "score": score,
                        "reason": reason
                    }]
                )
            else:
                # Escalate existing incident if condition worsened
                if score > existing_inc.risk_score or existing_inc.status == "NEW":
                    existing_inc.severity = level
                    existing_inc.risk_score = score
                    existing_inc.updated_at = self.sim_time
                    existing_inc.evidence_breakdown = evidence
                    existing_inc.timeline.append({
                        "timestamp": self.sim_time,
                        "action": "RISK_ESCALATED",
                        "severity": level,
                        "score": score,
                        "reason": reason
                    })

    def add_geofence(self, gf: Geofence) -> Geofence:
        """Add a custom geofence or update existing by id."""
        for i, existing in enumerate(self.geofences):
            if existing.id == gf.id:
                self.geofences[i] = gf
                return gf
        self.geofences.append(gf)
        return gf

    def delete_geofence(self, geofence_id: str) -> bool:
        """Delete a geofence by id."""
        initial_count = len(self.geofences)
        self.geofences = [g for g in self.geofences if g.id != geofence_id]
        return len(self.geofences) < initial_count

    def reset_geofences(self) -> List[Geofence]:
        """Reset geofences back to default seed set."""
        self.geofences = list(DEFAULT_GEOFENCES)
        return self.geofences

