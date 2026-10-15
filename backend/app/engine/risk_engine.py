from typing import Dict, Any, Tuple
from app.engine.models import TouristProfile

class ContextualRiskEngine:
    """
    Transparent, explainable risk assessment engine.
    Produces a 0-100 risk score based on deterministic contextual factors:
    - Base weights and multipliers for composite risks
    - Explicit explanation logs
    - Thresholds:
      0 - 24: LOW
      25 - 49: MEDIUM
      50 - 74: HIGH
      75 - 100: CRITICAL
    """

    # Scoring weights
    WEIGHT_ROUTE_DEVIATION = 30.0
    WEIGHT_INACTIVITY = 25.0
    WEIGHT_DANGER_GEOFENCE = 30.0
    WEIGHT_RESTRICTED_GEOFENCE = 25.0
    WEIGHT_WEATHER_HAZARD = 15.0
    WEIGHT_SIGNAL_LOSS = 20.0

    @classmethod
    def evaluate_risk(cls, evidence: Dict[str, Any], tourist_profile: TouristProfile) -> Tuple[float, str, str, Dict[str, Any]]:
        """
        Evaluate composite risk score, risk level, human-readable reason, and factor weights.
        Returns: (risk_score, risk_level, reason, factor_breakdown)
        """
        # Critical Override: SOS immediately sets 100 / CRITICAL
        if evidence.get("is_sos", False):
            return (
                100.0,
                "CRITICAL",
                "Immediate SOS distress button triggered by tourist",
                {
                    "sos_triggered": 100.0,
                    "reason": "Emergency SOS manual broadcast"
                }
            )

        score = 0.0
        factors: Dict[str, Any] = {}
        reason_parts = []

        # 1. Route deviation scoring
        dev_m = evidence.get("route_deviation_meters", 0.0)
        dev_score = 0.0
        if dev_m > 1200:
            dev_score = cls.WEIGHT_ROUTE_DEVIATION
            reason_parts.append(f"Severe route deviation ({dev_m:.0f}m)")
        elif dev_m > 600:
            dev_score = cls.WEIGHT_ROUTE_DEVIATION * 0.75
            reason_parts.append(f"Significant route deviation ({dev_m:.0f}m)")
        elif dev_m > 250:
            dev_score = cls.WEIGHT_ROUTE_DEVIATION * 0.4
            reason_parts.append(f"Mild route deviation ({dev_m:.0f}m)")
        factors["route_deviation"] = {"meters": dev_m, "score_contrib": round(dev_score, 1)}
        score += dev_score

        # 2. Inactivity scoring
        inactivity_mins = evidence.get("inactivity_minutes", 0.0)
        inact_score = 0.0
        if inactivity_mins >= 60.0:
            inact_score = cls.WEIGHT_INACTIVITY
            reason_parts.append(f"Prolonged stationary inactivity ({inactivity_mins:.0f} mins)")
        elif inactivity_mins >= 30.0:
            inact_score = cls.WEIGHT_INACTIVITY * 0.75
            reason_parts.append(f"Inactivity warning ({inactivity_mins:.0f} mins)")
        elif inactivity_mins >= 15.0:
            inact_score = cls.WEIGHT_INACTIVITY * 0.35
            reason_parts.append(f"Stationary for {inactivity_mins:.0f} mins")
        factors["inactivity"] = {"minutes": inactivity_mins, "score_contrib": round(inact_score, 1)}
        score += inact_score

        # 3. Geofence violation scoring
        geo_score = 0.0
        if evidence.get("entered_danger_zone", False):
            geo_score += cls.WEIGHT_DANGER_GEOFENCE
            reason_parts.append("Entered high-risk danger zone")
        elif evidence.get("entered_restricted_zone", False):
            geo_score += cls.WEIGHT_RESTRICTED_GEOFENCE
            reason_parts.append("Entered restricted boundary zone")
        elif evidence.get("entered_caution_zone", False):
            geo_score += 10.0
            reason_parts.append("Inside caution zone")
        factors["geofences"] = {
            "active": evidence.get("active_geofences", []),
            "score_contrib": round(geo_score, 1)
        }
        score += geo_score

        # 4. Weather hazard scoring
        weather_hazards = evidence.get("weather_hazards", [])
        weather_score = 0.0
        if weather_hazards:
            hazard_types = [h["hazard"] for h in weather_hazards]
            weather_score = cls.WEIGHT_WEATHER_HAZARD
            reason_parts.append(f"Adverse weather condition ({', '.join(hazard_types)})")
        factors["weather"] = {
            "hazards": weather_hazards,
            "score_contrib": round(weather_score, 1)
        }
        score += weather_score

        # 5. Signal loss scoring
        signal_status = evidence.get("signal_status", "NORMAL")
        delay_sec = evidence.get("signal_delay_seconds", 0.0)
        sig_score = 0.0
        if signal_status == "LOST":
            sig_score = cls.WEIGHT_SIGNAL_LOSS
            reason_parts.append(f"Telemetry signal lost ({delay_sec:.0f}s)")
        elif signal_status == "DELAYED":
            sig_score = cls.WEIGHT_SIGNAL_LOSS * 0.5
            reason_parts.append(f"Telemetry signal delayed ({delay_sec:.0f}s)")
        factors["signal"] = {"status": signal_status, "delay_seconds": delay_sec, "score_contrib": round(sig_score, 1)}
        score += sig_score

        # Multi-factor compounding:
        # Route deviation + Inactivity in remote/danger area escalates risk synergistically
        synergy_multiplier = 1.0
        if dev_score > 0 and inact_score > 0 and (geo_score > 0 or weather_score > 0):
            synergy_multiplier = 1.25
            reason_parts.append("Compound multi-hazard escalation (deviation + stationary + external risk)")
        elif dev_score > 0 and inact_score > 0:
            synergy_multiplier = 1.15
            reason_parts.append("Compound risk (off-route + stationary)")

        score = min(100.0, score * synergy_multiplier)
        score = round(score, 1)

        # Categorize risk level
        if score >= 75.0:
            level = "CRITICAL"
        elif score >= 50.0:
            level = "HIGH"
        elif score >= 25.0:
            level = "MEDIUM"
        else:
            level = "LOW"

        reason = "; ".join(reason_parts) if reason_parts else "Normal progression along designated corridor"

        return score, level, reason, factors
