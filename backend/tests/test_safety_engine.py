import pytest
from app.engine.geo import (
    haversine_distance,
    distance_point_to_segment,
    distance_point_to_polyline,
    is_point_in_polygon,
    is_point_in_circle
)
from app.engine.models import TouristProfile, TouristGPSUpdate, PlannedRoute, Coordinates, Geofence
from app.engine.detector import AnomalyDetector, SafetyEngineConfig
from app.engine.risk_engine import ContextualRiskEngine
from app.engine.simulation import SimulationEngine

def test_haversine_distance():
    # Distance between Manali and Solang (~13 km)
    p1 = (32.2396, 77.1887)
    p2 = (32.3170, 77.1578)
    dist = haversine_distance(p1, p2)
    assert 8000 < dist < 12000

def test_point_to_polyline_deviation():
    route = [(32.0, 77.0), (32.0, 77.1), (32.0, 77.2)]
    # Point exactly on line
    on_line = (32.0, 77.05)
    assert distance_point_to_polyline(on_line, route) < 1.0

    # Point 0.01 deg north of line (~1110 meters)
    off_line = (32.01, 77.05)
    deviation = distance_point_to_polyline(off_line, route)
    assert 1000 < deviation < 1250

def test_geofence_checks():
    center = (32.2450, 77.1850)
    inside_pt = (32.2452, 77.1852)
    outside_pt = (32.2600, 77.2000)
    assert is_point_in_circle(inside_pt, center, radius_meters=350.0) is True
    assert is_point_in_circle(outside_pt, center, radius_meters=350.0) is False

    poly = [(32.0, 77.0), (32.0, 77.2), (32.2, 77.2), (32.2, 77.0)]
    assert is_point_in_polygon((32.1, 77.1), poly) is True
    assert is_point_in_polygon((32.3, 77.1), poly) is False

def test_anomaly_detection_route_and_inactivity():
    detector = AnomalyDetector()
    route = PlannedRoute(
        route_id="r1",
        name="Test Trail",
        points=[Coordinates(lat=32.0, lon=77.0), Coordinates(lat=32.0, lon=77.1)],
        expected_duration_minutes=60
    )
    tourist = TouristProfile(
        tourist_id="T-001",
        name="Tester",
        nationality="Indian",
        age=25,
        persona_type="trekker",
        emergency_contact="000",
        digital_id_hash="0x123",
        planned_route=route,
        current_location=Coordinates(lat=32.007, lon=77.05),
        last_movement_timestamp=1000.0
    )

    gps = TouristGPSUpdate(
        tourist_id="T-001",
        lat=32.007,
        lon=77.05,
        timestamp=3100.0,
        speed_kmh=0.0
    )

    evidence = detector.evaluate_telemetry(tourist, gps, geofences=[], current_sim_time=3100.0)
    assert evidence["route_deviation_meters"] > 700.0
    assert evidence["deviation_severity"] in ["HIGH", "CRITICAL"]
    assert evidence["inactivity_minutes"] >= 35.0
    assert evidence["inactivity_severity"] in ["HIGH", "CRITICAL"]

def test_contextual_risk_scoring_compounding():
    tourist = TouristProfile(
        tourist_id="T-001",
        name="Trekker",
        nationality="Indian",
        age=30,
        persona_type="trekker",
        emergency_contact="000",
        digital_id_hash="0xabc"
    )

    # 1. Normal state
    evidence_normal = {
        "is_sos": False,
        "route_deviation_meters": 50.0,
        "inactivity_minutes": 2.0,
        "entered_danger_zone": False,
        "weather_hazards": []
    }
    score, level, reason, factors = ContextualRiskEngine.evaluate_risk(evidence_normal, tourist)
    assert score == 0.0
    assert level == "LOW"

    # 2. Compound Risk: Off-route + Stationary + Danger Zone + Heavy Rain
    evidence_compound = {
        "is_sos": False,
        "route_deviation_meters": 1300.0, # severe deviation
        "inactivity_minutes": 45.0, # high inactivity
        "entered_danger_zone": True, # danger zone
        "weather_hazards": [{"zone": "Dense Forest", "hazard": "heavy_rain"}],
        "active_geofences": ["Dense Forest"]
    }
    score, level, reason, factors = ContextualRiskEngine.evaluate_risk(evidence_compound, tourist)
    assert score >= 75.0
    assert level == "CRITICAL"
    assert "Compound multi-hazard escalation" in reason

def test_sos_immediate_override():
    tourist = TouristProfile(
        tourist_id="T-002",
        name="SOS Tester",
        nationality="Indian",
        age=28,
        persona_type="casual",
        emergency_contact="000",
        digital_id_hash="0xdef"
    )
    evidence_sos = {"is_sos": True}
    score, level, reason, factors = ContextualRiskEngine.evaluate_risk(evidence_sos, tourist)
    assert score == 100.0
    assert level == "CRITICAL"
    assert "SOS" in reason

def test_simulation_engine_20_tourists():
    sim = SimulationEngine(seed=100)
    assert len(sim.tourists) == 20
    
    # Step simulation forward
    result = sim.step(delta_seconds=10.0)
    assert result["processed_tourists"] == 20
    assert result["sim_time"] > 0
