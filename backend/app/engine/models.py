from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

class Coordinates(BaseModel):
    lat: float
    lon: float

class Geofence(BaseModel):
    id: str
    name: str
    type: Literal["circle", "polygon"]
    category: Literal["safe", "caution", "danger", "restricted", "crowd"]
    # For circle:
    center: Optional[Coordinates] = None
    radius_meters: Optional[float] = None
    # For polygon:
    polygon_points: Optional[List[Coordinates]] = None
    description: str = ""
    weather_hazard: Optional[str] = None # e.g. "heavy_rain", "landslide_risk", "none"
    crowd_density: Optional[float] = 0.0 # 0.0 to 1.0

class TouristGPSUpdate(BaseModel):
    tourist_id: str
    lat: float
    lon: float
    altitude_meters: Optional[float] = 0.0
    accuracy_meters: float = 5.0
    speed_kmh: float = 3.5
    timestamp: float # Unix timestamp in seconds
    is_sos_pressed: bool = False
    battery_level: float = 95.0

class PlannedRoute(BaseModel):
    route_id: str
    name: str
    points: List[Coordinates]
    expected_duration_minutes: int

class TouristProfile(BaseModel):
    tourist_id: str
    name: str
    nationality: str
    age: int
    persona_type: Literal["trekker", "family", "explorer", "casual"]
    emergency_contact: str
    digital_id_hash: str # simulated blockchain credential hash
    consent_given: bool = True
    planned_route: Optional[PlannedRoute] = None
    
    # State tracking
    current_location: Optional[Coordinates] = None
    previous_location: Optional[Coordinates] = None
    last_movement_timestamp: float = 0.0
    last_update_timestamp: float = 0.0
    current_geofences: List[str] = []
    
    # Metrics
    current_route_deviation_meters: float = 0.0
    inactivity_minutes: float = 0.0
    signal_delay_seconds: float = 0.0
    is_signal_lost: bool = False
    active_weather_hazards: List[str] = []
    
    # Risk
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "LOW"
    risk_score: float = 0.0 # 0 to 100
    risk_factors: Dict[str, Any] = {}
    last_assessment_reason: str = "Normal route progression"

class Incident(BaseModel):
    incident_id: str
    tourist_id: str
    tourist_name: str
    type: Literal["ROUTE_DEVIATION", "PROLONGED_INACTIVITY", "GEOFENCE_BREACH", "SIGNAL_LOSS", "WEATHER_HAZARD", "SOS_EMERGENCY", "MULTI_FACTOR_RISK", "CROWD_SURGE", "ASSISTANCE_REQUEST"]
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    risk_score: float
    status: Literal["NEW", "ACKNOWLEDGED", "UNDER_INVESTIGATION", "TEAM_ASSIGNED", "RESPONDING", "RESOLVED", "FALSE_ALARM"]
    location: Coordinates
    created_at: float
    updated_at: float
    assigned_unit_id: Optional[str] = None
    evidence_breakdown: Dict[str, Any] = {}
    notes: List[str] = []
    timeline: List[Dict[str, Any]] = []

class ResponseUnit(BaseModel):
    unit_id: str
    name: str
    type: Literal["POLICE", "MEDICAL", "MOUNTAIN_RESCUE", "RANGER"]
    current_location: Coordinates
    status: Literal["AVAILABLE", "DISPATCHED", "ON_SCENE", "OFFLINE"]
    assigned_incident_id: Optional[str] = None
