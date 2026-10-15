import time
from typing import Dict, Any, List, Optional
from app.engine.models import Coordinates, TouristProfile, Incident
from app.engine.simulation import SimulationEngine

class TrekkingScenarioRunner:
    """
    State machine for Section 6: "Remote Trekking Risk Escalation".
    Stages:
    1: Normal Travel (Following trail, low risk)
    2: Route Deviation (Moving away from planned trail, detected by engine)
    3: Dangerous Area Entry (Enters Dense Forest danger geofence, notification dispatched)
    4: Prolonged Inactivity (Stationary beyond threshold, risk score increases)
    5: Environmental Deterioration (Heavy rainfall introduced, compounding multi-hazard)
    6: Proactive Warning & Authority Alert (Warning sent to tourist, incident escalated to authority queue)
    7: Human-Led Intervention (Officer acknowledges alert, reviews evidence, assigns response squad)
    8: Resolution (Unit reaches tourist, guided back safely, incident resolved with audit timeline)
    """

    STAGE_DESCRIPTIONS = {
        1: "Normal Travel: Tourist moving normally along planned trail corridor.",
        2: "Route Deviation: Tourist leaves marked trail path (detected: 535m deviation).",
        3: "Dangerous Area Entry: Tourist enters high-risk Dense Forest geofence.",
        4: "Prolonged Inactivity: Tourist remains stationary off-trail for over 35 minutes.",
        5: "Environmental Deterioration: Severe rainfall and flash hazard declared in area.",
        6: "Proactive Warning & Escalation: Automated warning sent to tourist companion; critical incident logged.",
        7: "Human-Led Intervention: Authority acknowledges alert and dispatches nearest rescue squad.",
        8: "Incident Resolution: Rescue squad reaches tourist, administers first aid, resolves incident."
    }

    def __init__(self, sim_engine: SimulationEngine, tourist_id: str = "T-101"):
        self.sim = sim_engine
        self.tourist_id = tourist_id
        self.current_stage: int = 1
        self.active_incident_id: Optional[str] = None
        self.assigned_unit_id: Optional[str] = None
        self.is_auto_playing: bool = False

    def get_state(self) -> Dict[str, Any]:
        return {
            "current_stage": self.current_stage,
            "max_stages": 8,
            "stage_title": f"Stage {self.current_stage}: {self.STAGE_DESCRIPTIONS.get(self.current_stage, '').split(':')[0]}",
            "stage_description": self.STAGE_DESCRIPTIONS.get(self.current_stage, ""),
            "tourist_id": self.tourist_id,
            "active_incident_id": self.active_incident_id,
            "is_auto_playing": self.is_auto_playing
        }

    def set_stage(self, stage: int) -> Dict[str, Any]:
        self.current_stage = max(1, min(8, stage))
        tid = self.tourist_id
        tourist = self.sim.tourists.get(tid)
        if not tourist:
            return self.get_state()

        if self.current_stage == 1:
            # Stage 1: Normal Travel
            self.sim.tourist_modes[tid] = "normal"
            self.sim.step(delta_seconds=10.0)

        elif self.current_stage == 2:
            # Stage 2: Route Deviation
            self.sim.tourist_modes[tid] = "deviating"
            # Move off-trail but before danger zone
            base_pt = tourist.planned_route.points[3]
            tourist.current_location = Coordinates(lat=base_pt.lat + 0.005, lon=base_pt.lon - 0.006)
            self.sim.step(delta_seconds=10.0)

        elif self.current_stage == 3:
            # Stage 3: Dangerous Area Entry
            self.sim.tourist_modes[tid] = "deviating"
            tourist.current_location = Coordinates(lat=17.6710, lon=73.7020) # Inside dense Koyna forest polygon
            self.sim.step(delta_seconds=10.0)

        elif self.current_stage == 4:
            # Stage 4: Prolonged Inactivity
            self.sim.tourist_modes[tid] = "stopped"
            tourist.current_location = Coordinates(lat=17.6710, lon=73.7020)
            self.sim.step(delta_seconds=2200.0)

        elif self.current_stage == 5:
            # Stage 5: Environmental Deterioration (Heavy rainfall)
            self.sim.tourist_modes[tid] = "stopped"
            tourist.current_location = Coordinates(lat=17.6710, lon=73.7020)
            # Advance time by 45 mins
            self.sim.step(delta_seconds=2700.0)
            # Find active incident
            for inc in self.sim.store.list_incidents():
                if inc.tourist_id == tid and inc.status not in ["RESOLVED", "FALSE_ALARM"]:
                    self.active_incident_id = inc.incident_id
                    break

        elif self.current_stage == 6:
            # Stage 6: Proactive Warning & Authority Alert
            # Incident is already critical; ensure warning notification in incident timeline
            if not self.active_incident_id:
                for inc in self.sim.store.list_incidents():
                    if inc.tourist_id == tid and inc.status not in ["RESOLVED", "FALSE_ALARM"]:
                        self.active_incident_id = inc.incident_id
                        break
            if self.active_incident_id:
                inc = self.sim.store.get_incident(self.active_incident_id)
                if inc:
                    inc.notes.append("[SYSTEM PROACTIVE WARNING] Advisory alert sent to tourist mobile companion: Severe weather & off-route danger.")
                    self.sim.store.save_incident(inc)

        elif self.current_stage == 7:
            # Stage 7: Human-Led Intervention
            if not self.active_incident_id:
                for inc in self.sim.store.list_incidents():
                    if inc.tourist_id == tid and inc.status not in ["RESOLVED", "FALSE_ALARM"]:
                        self.active_incident_id = inc.incident_id
                        break
            if self.active_incident_id:
                inc = self.sim.store.get_incident(self.active_incident_id)
                if inc and inc.status == "NEW":
                    self.sim.workflow.acknowledge_incident(inc.incident_id, "OFFICER-SHARMA-09", "Acknowledged critical alert. High-risk forest zone.")
                # Get nearest unit
                units = self.sim.workflow.get_recommended_units(self.active_incident_id)
                if units:
                    best_unit = units[0]["unit"]
                    self.assigned_unit_id = best_unit.unit_id
                    if inc and inc.status in ["ACKNOWLEDGED", "NEW"]:
                        self.sim.workflow.assign_response_unit(self.active_incident_id, best_unit.unit_id, "OFFICER-SHARMA-09")
                        self.sim.workflow.dispatch_unit_responding(self.active_incident_id, "OFFICER-SHARMA-09", eta_minutes=12)

        elif self.current_stage == 8:
            # Stage 8: Resolution
            if not self.active_incident_id:
                for inc in self.sim.store.list_incidents():
                    if inc.tourist_id == tid:
                        self.active_incident_id = inc.incident_id
                        break
            if self.active_incident_id:
                inc = self.sim.store.get_incident(self.active_incident_id)
                if inc and inc.status not in ["RESOLVED", "FALSE_ALARM"]:
                    self.sim.workflow.resolve_incident(
                        self.active_incident_id,
                        "OFFICER-SHARMA-09",
                        "Squad reached tourist. Warm shelter and hydration provided. Escorted safely to Met Indavali Base Camp."
                    )
            # Restore tourist to normal safe status
            self.sim.tourist_modes[tid] = "normal"
            tourist.current_location = tourist.planned_route.points[0]
            tourist.risk_score = 0.0
            tourist.risk_level = "LOW"
            tourist.last_assessment_reason = "Incident resolved; returned safely to base"

        return self.get_state()

    def advance(self) -> Dict[str, Any]:
        return self.set_stage(self.current_stage + 1)

    def reset(self) -> Dict[str, Any]:
        return self.set_stage(1)
