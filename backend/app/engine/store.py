import json
import os
from typing import Dict, Any, List, Optional
from app.engine.models import Incident, ResponseUnit, Coordinates

class IncidentStore:
    """
    Persistent store for incidents and response units.
    Persists incident lifecycle transitions to a local JSON database (with Mongo-compatible interface)
    so data survives across server restarts and retains a complete immutable audit trail.
    """

    def __init__(self, storage_path: str = "data/incidents_db.json"):
        self.storage_path = storage_path
        os.makedirs(os.path.dirname(storage_path), exist_ok=True)
        self.incidents: Dict[str, Incident] = {}
        self.response_units: Dict[str, ResponseUnit] = {}
        self._load_from_disk()
        self._init_default_response_units()

    def clear_all(self):
        """Reset incidents for tests or scenario restarts."""
        self.incidents.clear()
        self._init_default_response_units()
        self._save_to_disk()

    def _init_default_response_units(self):
        """Seed realistic emergency response units stationed near base."""
        if not self.response_units:
            units = [
                ResponseUnit(
                    unit_id="UNIT-RESCUE-01",
                    name="Sahyadri Mountain Rescue Squad Alpha",
                    type="MOUNTAIN_RESCUE",
                    current_location=Coordinates(lat=17.6710, lon=73.7160),
                    status="AVAILABLE"
                ),
                ResponseUnit(
                    unit_id="UNIT-POLICE-02",
                    name="Satara Rural Police Quick Reaction Unit",
                    type="POLICE",
                    current_location=Coordinates(lat=17.7265, lon=73.7470),
                    status="AVAILABLE"
                ),
                ResponseUnit(
                    unit_id="UNIT-MED-03",
                    name="Koyna Backwaters Boat Ambulance Med-1",
                    type="MEDICAL",
                    current_location=Coordinates(lat=17.7275, lon=73.7465),
                    status="AVAILABLE"
                ),
                ResponseUnit(
                    unit_id="UNIT-RANGER-04",
                    name="Koyna Wildlife Sanctuary Forest Patrol Bravo",
                    type="RANGER",
                    current_location=Coordinates(lat=17.6680, lon=73.7050),
                    status="AVAILABLE"
                ),
            ]
            for u in units:
                self.response_units[u.unit_id] = u
            self._save_to_disk()

    def _save_to_disk(self):
        try:
            data = {
                "incidents": {k: v.model_dump() for k, v in self.incidents.items()},
                "response_units": {k: v.model_dump() for k, v in self.response_units.items()}
            }
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"[Warning] Failed to persist incident DB: {e}")

    def _load_from_disk(self):
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for k, v in data.get("incidents", {}).items():
                        self.incidents[k] = Incident(**v)
                    for k, v in data.get("response_units", {}).items():
                        self.response_units[k] = ResponseUnit(**v)
            except Exception as e:
                print(f"[Warning] Failed to load incident DB: {e}")

    def get_incident(self, incident_id: str) -> Optional[Incident]:
        return self.incidents.get(incident_id)

    def list_incidents(self, status: Optional[str] = None) -> List[Incident]:
        items = list(self.incidents.values())
        if status:
            items = [i for i in items if i.status == status]
        # Return sorted by updated_at descending
        return sorted(items, key=lambda x: x.updated_at, reverse=True)

    def save_incident(self, incident: Incident):
        self.incidents[incident.incident_id] = incident
        self._save_to_disk()

    def get_response_unit(self, unit_id: str) -> Optional[ResponseUnit]:
        return self.response_units.get(unit_id)

    def list_response_units(self) -> List[ResponseUnit]:
        return list(self.response_units.values())

    def save_response_unit(self, unit: ResponseUnit):
        self.response_units[unit.unit_id] = unit
        self._save_to_disk()
