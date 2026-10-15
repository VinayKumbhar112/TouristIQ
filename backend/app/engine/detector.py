from typing import Dict, Any, List, Optional, Tuple
from app.engine.models import TouristProfile, TouristGPSUpdate, Geofence
from app.engine.geo import (
    haversine_distance,
    distance_point_to_polyline,
    is_point_in_circle,
    is_point_in_polygon
)

class SafetyEngineConfig:
    # Deviation thresholds
    DEVIATION_CAUTION_METERS: float = 250.0
    DEVIATION_WARNING_METERS: float = 600.0
    DEVIATION_CRITICAL_METERS: float = 1200.0

    # Inactivity thresholds
    INACTIVITY_STATIONARY_SPEED_KMH: float = 0.5
    INACTIVITY_CAUTION_MINUTES: float = 15.0
    INACTIVITY_WARNING_MINUTES: float = 30.0
    INACTIVITY_CRITICAL_MINUTES: float = 60.0

    # Signal loss thresholds
    SIGNAL_DELAY_WARN_SECONDS: float = 120.0
    SIGNAL_LOST_CRITICAL_SECONDS: float = 300.0

    # Minimum movement distance to count as active (meters)
    MOVEMENT_DELTA_THRESHOLD_METERS: float = 15.0

class AnomalyDetector:
    """
    Deterministic rule-based detector for tourist safety signals:
    1. Route deviation
    2. Prolonged inactivity
    3. Geofence violation (caution / danger / restricted)
    4. Signal delay & dropout
    5. Environmental weather hazards
    6. Manual SOS
    """

    def __init__(self, config: SafetyEngineConfig = SafetyEngineConfig()):
        self.config = config

    def evaluate_telemetry(
        self,
        tourist: TouristProfile,
        gps: TouristGPSUpdate,
        geofences: List[Geofence],
        current_sim_time: float
    ) -> Dict[str, Any]:
        """
        Evaluate raw GPS telemetry against tourist profile, planned route, and spatial zones.
        Returns a structured evidence dictionary.
        """
        evidence: Dict[str, Any] = {
            "tourist_id": tourist.tourist_id,
            "timestamp": gps.timestamp,
            "is_sos": gps.is_sos_pressed,
            "route_deviation_meters": 0.0,
            "deviation_severity": "NONE",
            "inactivity_minutes": 0.0,
            "inactivity_severity": "NONE",
            "active_geofences": [],
            "entered_danger_zone": False,
            "entered_restricted_zone": False,
            "entered_caution_zone": False,
            "weather_hazards": [],
            "signal_delay_seconds": max(0.0, current_sim_time - gps.timestamp),
            "signal_status": "NORMAL"
        }

        # 1. SOS check
        if gps.is_sos_pressed:
            evidence["is_sos"] = True

        # 2. Route deviation
        if tourist.planned_route and tourist.planned_route.points:
            polyline = [(pt.lat, pt.lon) for pt in tourist.planned_route.points]
            curr_pt = (gps.lat, gps.lon)
            dev_meters = distance_point_to_polyline(curr_pt, polyline)
            evidence["route_deviation_meters"] = round(dev_meters, 1)

            if dev_meters >= self.config.DEVIATION_CRITICAL_METERS:
                evidence["deviation_severity"] = "CRITICAL"
            elif dev_meters >= self.config.DEVIATION_WARNING_METERS:
                evidence["deviation_severity"] = "HIGH"
            elif dev_meters >= self.config.DEVIATION_CAUTION_METERS:
                evidence["deviation_severity"] = "MEDIUM"
            else:
                evidence["deviation_severity"] = "LOW"

        # 3. Inactivity calculation
        moved_dist = 0.0
        if tourist.current_location is not None:
            moved_dist = haversine_distance(
                (tourist.current_location.lat, tourist.current_location.lon),
                (gps.lat, gps.lon)
            )

        # Update last movement timestamp if tourist moved meaningfully or reported movement speed
        if moved_dist >= self.config.MOVEMENT_DELTA_THRESHOLD_METERS or gps.speed_kmh > self.config.INACTIVITY_STATIONARY_SPEED_KMH:
            last_move = gps.timestamp
            inactivity_mins = 0.0
        else:
            last_move = tourist.last_movement_timestamp if tourist.last_movement_timestamp > 0 else gps.timestamp
            inactivity_mins = max(0.0, (gps.timestamp - last_move) / 60.0)

        evidence["inactivity_minutes"] = round(inactivity_mins, 1)
        evidence["last_movement_timestamp"] = last_move

        if inactivity_mins >= self.config.INACTIVITY_CRITICAL_MINUTES:
            evidence["inactivity_severity"] = "CRITICAL"
        elif inactivity_mins >= self.config.INACTIVITY_WARNING_MINUTES:
            evidence["inactivity_severity"] = "HIGH"
        elif inactivity_mins >= self.config.INACTIVITY_CAUTION_MINUTES:
            evidence["inactivity_severity"] = "MEDIUM"
        else:
            evidence["inactivity_severity"] = "NONE"

        # 4. Geofences check
        curr_pt = (gps.lat, gps.lon)
        active_zones = []
        for gf in geofences:
            is_inside = False
            if gf.type == "circle" and gf.center and gf.radius_meters:
                is_inside = is_point_in_circle(curr_pt, (gf.center.lat, gf.center.lon), gf.radius_meters)
            elif gf.type == "polygon" and gf.polygon_points:
                poly = [(pt.lat, pt.lon) for pt in gf.polygon_points]
                is_inside = is_point_in_polygon(curr_pt, poly)

            if is_inside:
                active_zones.append(gf.name)
                if gf.category == "danger":
                    evidence["entered_danger_zone"] = True
                elif gf.category == "restricted":
                    evidence["entered_restricted_zone"] = True
                elif gf.category == "caution":
                    evidence["entered_caution_zone"] = True

                if gf.weather_hazard and gf.weather_hazard != "none":
                    evidence["weather_hazards"].append({
                        "zone": gf.name,
                        "hazard": gf.weather_hazard
                    })

        evidence["active_geofences"] = active_zones

        # 5. Signal freshness
        sig_delay = evidence["signal_delay_seconds"]
        if sig_delay >= self.config.SIGNAL_LOST_CRITICAL_SECONDS:
            evidence["signal_status"] = "LOST"
        elif sig_delay >= self.config.SIGNAL_DELAY_WARN_SECONDS:
            evidence["signal_status"] = "DELAYED"

        return evidence
