import time
from typing import Dict, Any, List, Optional
from app.engine.models import Incident, ResponseUnit, Coordinates, TouristProfile
from app.engine.store import IncidentStore
from app.engine.geo import haversine_distance

VALID_TRANSITIONS = {
    "NEW": ["ACKNOWLEDGED", "FALSE_ALARM"],
    "ACKNOWLEDGED": ["UNDER_INVESTIGATION", "TEAM_ASSIGNED", "FALSE_ALARM"],
    "UNDER_INVESTIGATION": ["TEAM_ASSIGNED", "RESOLVED", "FALSE_ALARM"],
    "TEAM_ASSIGNED": ["RESPONDING", "RESOLVED"],
    "RESPONDING": ["RESOLVED"],
    "FALSE_ALARM": [],
    "RESOLVED": []
}

class ResponseWorkflowManager:
    """
    Manages the complete incident response lifecycle:
    NEW -> ACKNOWLEDGED -> UNDER_INVESTIGATION -> TEAM_ASSIGNED -> RESPONDING -> RESOLVED
    Supports:
    - Automatic creation and deduplication/escalation on high/critical anomaly detection
    - Officer acknowledgement and notes
    - Nearest response unit recommendation and assignment
    - Simulated unit dispatch with distance calculations
    - Resolution recording with full immutable timeline
    - False alarm categorization with mandatory reason
    """

    def __init__(self, store: Optional[IncidentStore] = None):
        self.store = store or IncidentStore()

    def process_telemetry_risk(
        self,
        tourist: TouristProfile,
        evidence: Dict[str, Any],
        score: float,
        level: str,
        reason: str,
        current_time: float
    ) -> Optional[Incident]:
        """
        Create a new incident or escalate an existing active incident for a tourist.
        Prevents endless duplicate records; tracks history via the audit timeline.
        """
        # Incidents are raised for HIGH (>= 50) and CRITICAL (>= 75 or SOS)
        if level not in ["HIGH", "CRITICAL"]:
            return None

        # Check for active unresolved incident for this tourist
        active_incident: Optional[Incident] = None
        for inc in self.store.list_incidents():
            if inc.tourist_id == tourist.tourist_id and inc.status not in ["RESOLVED", "FALSE_ALARM"]:
                active_incident = inc
                break

        if active_incident is None:
            # Create NEW incident
            inc_type = "SOS_EMERGENCY" if evidence.get("is_sos") else (
                "GEOFENCE_BREACH" if evidence.get("entered_danger_zone") else
                "ROUTE_DEVIATION" if evidence.get("route_deviation_meters", 0) > 600 else
                "PROLONGED_INACTIVITY" if evidence.get("inactivity_minutes", 0) > 30 else
                "MULTI_FACTOR_RISK"
            )

            new_incident = Incident(
                incident_id=f"INC-{tourist.tourist_id}-{int(current_time)}",
                tourist_id=tourist.tourist_id,
                tourist_name=tourist.name,
                type=inc_type,
                severity=level,
                risk_score=score,
                status="NEW",
                location=tourist.current_location or Coordinates(lat=0.0, lon=0.0),
                created_at=current_time,
                updated_at=current_time,
                evidence_breakdown=evidence,
                notes=[f"Auto-flagged: {reason}"],
                timeline=[{
                    "timestamp": current_time,
                    "action": "INCIDENT_TRIGGERED",
                    "actor": "SAFETY_ENGINE",
                    "from_status": None,
                    "to_status": "NEW",
                    "severity": level,
                    "risk_score": score,
                    "reason": reason
                }]
            )
            self.store.save_incident(new_incident)
            return new_incident

        else:
            # Escalate or update existing incident if risk worsened
            has_escalated = False
            if score > active_incident.risk_score:
                active_incident.risk_score = score
                has_escalated = True
            if level == "CRITICAL" and active_incident.severity != "CRITICAL":
                active_incident.severity = "CRITICAL"
                has_escalated = True

            active_incident.updated_at = current_time
            active_incident.location = tourist.current_location or active_incident.location
            active_incident.evidence_breakdown = evidence

            if has_escalated:
                active_incident.timeline.append({
                    "timestamp": current_time,
                    "action": "RISK_ESCALATED",
                    "actor": "SAFETY_ENGINE",
                    "from_status": active_incident.status,
                    "to_status": active_incident.status,
                    "severity": active_incident.severity,
                    "risk_score": active_incident.risk_score,
                    "reason": f"Risk worsened: {reason}"
                })
                self.store.save_incident(active_incident)

            return active_incident

    def acknowledge_incident(self, incident_id: str, officer_id: str, note: Optional[str] = None, timestamp: Optional[float] = None) -> Incident:
        inc = self._get_or_raise(incident_id)
        self._validate_transition(inc.status, "ACKNOWLEDGED")

        ts = timestamp or time.time()
        from_status = inc.status
        inc.status = "ACKNOWLEDGED"
        inc.updated_at = ts
        if note:
            inc.notes.append(f"[{officer_id}] {note}")
        inc.timeline.append({
            "timestamp": ts,
            "action": "ACKNOWLEDGED",
            "actor": officer_id,
            "from_status": from_status,
            "to_status": "ACKNOWLEDGED",
            "note": note or "Officer acknowledged active incident"
        })
        self.store.save_incident(inc)
        return inc

    def investigate_incident(self, incident_id: str, officer_id: str, findings: str, timestamp: Optional[float] = None) -> Incident:
        inc = self._get_or_raise(incident_id)
        self._validate_transition(inc.status, "UNDER_INVESTIGATION")

        ts = timestamp or time.time()
        from_status = inc.status
        inc.status = "UNDER_INVESTIGATION"
        inc.updated_at = ts
        inc.notes.append(f"[{officer_id} - Investigation] {findings}")
        inc.timeline.append({
            "timestamp": ts,
            "action": "INVESTIGATION_STARTED",
            "actor": officer_id,
            "from_status": from_status,
            "to_status": "UNDER_INVESTIGATION",
            "note": findings
        })
        self.store.save_incident(inc)
        return inc

    def get_recommended_units(self, incident_id: str) -> List[Dict[str, Any]]:
        """Return available response units ranked by proximity in meters/km to the incident."""
        inc = self._get_or_raise(incident_id)
        inc_coords = (inc.location.lat, inc.location.lon)

        units = self.store.list_response_units()
        ranked = []
        for u in units:
            unit_coords = (u.current_location.lat, u.current_location.lon)
            dist_m = haversine_distance(inc_coords, unit_coords)
            ranked.append({
                "unit": u,
                "distance_meters": round(dist_m, 1),
                "distance_km": round(dist_m / 1000.0, 2),
                "is_available": (u.status == "AVAILABLE")
            })

        return sorted(ranked, key=lambda x: (not x["is_available"], x["distance_meters"]))

    def assign_response_unit(self, incident_id: str, unit_id: str, officer_id: str, timestamp: Optional[float] = None) -> Incident:
        inc = self._get_or_raise(incident_id)
        self._validate_transition(inc.status, "TEAM_ASSIGNED")

        unit = self.store.get_response_unit(unit_id)
        if not unit:
            raise ValueError(f"Response unit {unit_id} not found")

        ts = timestamp or time.time()
        from_status = inc.status
        inc.status = "TEAM_ASSIGNED"
        inc.assigned_unit_id = unit_id
        inc.updated_at = ts
        inc.notes.append(f"[{officer_id}] Assigned unit {unit.name} ({unit.type})")

        # Update unit status
        unit.status = "DISPATCHED"
        unit.assigned_incident_id = incident_id
        self.store.save_response_unit(unit)

        inc.timeline.append({
            "timestamp": ts,
            "action": "UNIT_ASSIGNED",
            "actor": officer_id,
            "from_status": from_status,
            "to_status": "TEAM_ASSIGNED",
            "unit_id": unit_id,
            "unit_name": unit.name
        })
        self.store.save_incident(inc)
        return inc

    def dispatch_unit_responding(self, incident_id: str, officer_id: str, eta_minutes: int = 15, timestamp: Optional[float] = None) -> Incident:
        inc = self._get_or_raise(incident_id)
        self._validate_transition(inc.status, "RESPONDING")

        ts = timestamp or time.time()
        from_status = inc.status
        inc.status = "RESPONDING"
        inc.updated_at = ts
        inc.notes.append(f"[{officer_id}] Team en route. Estimated arrival in {eta_minutes} mins.")

        if inc.assigned_unit_id:
            unit = self.store.get_response_unit(inc.assigned_unit_id)
            if unit:
                unit.status = "ON_SCENE"
                self.store.save_response_unit(unit)

        inc.timeline.append({
            "timestamp": ts,
            "action": "UNIT_EN_ROUTE",
            "actor": officer_id,
            "from_status": from_status,
            "to_status": "RESPONDING",
            "eta_minutes": eta_minutes
        })
        self.store.save_incident(inc)
        return inc

    def resolve_incident(self, incident_id: str, officer_id: str, resolution_summary: str, timestamp: Optional[float] = None) -> Incident:
        inc = self._get_or_raise(incident_id)
        if inc.status in ["RESOLVED", "FALSE_ALARM"]:
            raise ValueError(f"Incident {incident_id} is already closed ({inc.status})")

        ts = timestamp or time.time()
        from_status = inc.status
        inc.status = "RESOLVED"
        inc.updated_at = ts
        inc.notes.append(f"[{officer_id} - Resolution] {resolution_summary}")

        # Free the assigned unit
        if inc.assigned_unit_id:
            unit = self.store.get_response_unit(inc.assigned_unit_id)
            if unit:
                unit.status = "AVAILABLE"
                unit.assigned_incident_id = None
                self.store.save_response_unit(unit)

        inc.timeline.append({
            "timestamp": ts,
            "action": "INCIDENT_RESOLVED",
            "actor": officer_id,
            "from_status": from_status,
            "to_status": "RESOLVED",
            "resolution": resolution_summary
        })
        self.store.save_incident(inc)
        return inc

    def mark_false_alarm(self, incident_id: str, officer_id: str, reason: str, timestamp: Optional[float] = None) -> Incident:
        inc = self._get_or_raise(incident_id)
        if inc.status in ["RESOLVED", "FALSE_ALARM"]:
            raise ValueError(f"Incident {incident_id} is already closed ({inc.status})")

        ts = timestamp or time.time()
        from_status = inc.status
        inc.status = "FALSE_ALARM"
        inc.updated_at = ts
        inc.notes.append(f"[{officer_id} - Classified False Alarm] {reason}")

        if inc.assigned_unit_id:
            unit = self.store.get_response_unit(inc.assigned_unit_id)
            if unit:
                unit.status = "AVAILABLE"
                unit.assigned_incident_id = None
                self.store.save_response_unit(unit)

        inc.timeline.append({
            "timestamp": ts,
            "action": "CLASSIFIED_FALSE_ALARM",
            "actor": officer_id,
            "from_status": from_status,
            "to_status": "FALSE_ALARM",
            "reason": reason
        })
        self.store.save_incident(inc)
        return inc

    def _get_or_raise(self, incident_id: str) -> Incident:
        inc = self.store.get_incident(incident_id)
        if not inc:
            raise ValueError(f"Incident {incident_id} not found")
        return inc

    def _validate_transition(self, current_status: str, target_status: str):
        allowed = VALID_TRANSITIONS.get(current_status, [])
        if target_status not in allowed:
            raise ValueError(f"Invalid transition from {current_status} to {target_status}. Allowed: {allowed}")
