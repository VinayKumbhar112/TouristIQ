export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Geofence {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  category: 'safe' | 'caution' | 'danger' | 'restricted' | 'crowd';
  center?: Coordinates;
  radius_meters?: number;
  polygon_points?: Coordinates[];
  description: string;
  weather_hazard?: string;
  crowd_density?: number;
}

export interface PlannedRoute {
  route_id: string;
  name: string;
  points: Coordinates[];
  expected_duration_minutes: number;
}

export interface TouristProfile {
  tourist_id: string;
  name: string;
  nationality: string;
  age: number;
  persona_type: 'trekker' | 'family' | 'explorer' | 'casual';
  emergency_contact: string;
  digital_id_hash: string;
  consent_given: boolean;
  planned_route?: PlannedRoute;
  current_location?: Coordinates;
  previous_location?: Coordinates;
  last_movement_timestamp: number;
  last_update_timestamp: number;
  current_geofences: string[];
  current_route_deviation_meters: number;
  inactivity_minutes: number;
  signal_delay_seconds: number;
  is_signal_lost: boolean;
  active_weather_hazards: string[];
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  risk_factors: Record<string, any>;
  last_assessment_reason: string;
}

export interface IncidentTimelineItem {
  timestamp: number;
  action: string;
  actor?: string;
  from_status?: string;
  to_status?: string;
  severity?: string;
  risk_score?: number;
  reason?: string;
  note?: string;
  unit_id?: string;
  unit_name?: string;
  eta_minutes?: number;
  resolution?: string;
}

export interface Incident {
  incident_id: string;
  tourist_id: string;
  tourist_name: string;
  type: 'ROUTE_DEVIATION' | 'PROLONGED_INACTIVITY' | 'GEOFENCE_BREACH' | 'SIGNAL_LOSS' | 'WEATHER_HAZARD' | 'SOS_EMERGENCY' | 'MULTI_FACTOR_RISK' | 'CROWD_SURGE' | 'ASSISTANCE_REQUEST';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  status: 'NEW' | 'ACKNOWLEDGED' | 'UNDER_INVESTIGATION' | 'TEAM_ASSIGNED' | 'RESPONDING' | 'RESOLVED' | 'FALSE_ALARM';
  location: Coordinates;
  created_at: number;
  updated_at: number;
  assigned_unit_id?: string;
  evidence_breakdown: Record<string, any>;
  notes: string[];
  timeline: IncidentTimelineItem[];
}

export interface ResponseUnit {
  unit_id: string;
  name: string;
  type: 'POLICE' | 'MEDICAL' | 'MOUNTAIN_RESCUE' | 'RANGER';
  current_location: Coordinates;
  status: 'AVAILABLE' | 'DISPATCHED' | 'ON_SCENE' | 'OFFLINE';
  assigned_incident_id?: string;
}

export interface RecommendedUnit {
  unit: ResponseUnit;
  distance_meters: number;
  distance_km: number;
  is_available: boolean;
}

export interface TrekkingScenarioState {
  current_stage: number;
  max_stages: number;
  stage_title: string;
  stage_description: string;
  tourist_id: string;
  active_incident_id?: string;
  is_auto_playing: boolean;
}

export interface SimulationState {
  sim_time: number;
  is_paused: boolean;
  speed_multiplier: number;
  tourists: TouristProfile[];
  incidents: Incident[];
  response_units: ResponseUnit[];
  geofences: Geofence[];
  stats: {
    total_tourists: number;
    high_critical_risk_count: number;
    open_incidents_count: number;
    available_units_count: number;
  };
  trekking_scenario?: TrekkingScenarioState;
}
