import pytest
from fastapi.testclient import TestClient
from app.main import app, sim_engine, trekking_runner

@pytest.fixture(autouse=True)
def reset_all():
    sim_engine.store.clear_all()
    sim_engine.__init__(seed=42)
    trekking_runner.sim = sim_engine
    trekking_runner.set_stage(1)

def test_eight_stage_trekking_escalation_lifecycle():
    client = TestClient(app)

    # Stage 1: Normal Travel
    r1 = client.post("/api/simulation/scenarios/trekking/stage", json={"action": "set_stage", "stage": 1})
    assert r1.status_code == 200
    st1 = r1.json()
    assert st1["current_stage"] == 1
    t1 = client.get("/api/tourists/T-101").json()
    assert t1["risk_level"] == "LOW"

    # Stage 2: Route Deviation
    r2 = client.post("/api/simulation/scenarios/trekking/stage", json={"action": "next"})
    assert r2.status_code == 200
    st2 = r2.json()
    assert st2["current_stage"] == 2
    t2 = client.get("/api/tourists/T-101").json()
    assert t2["current_route_deviation_meters"] > 300.0

    # Stage 3: Dangerous Area Entry
    r3 = client.post("/api/simulation/scenarios/trekking/stage", json={"action": "next"})
    assert r3.status_code == 200
    st3 = r3.json()
    assert st3["current_stage"] == 3
    t3 = client.get("/api/tourists/T-101").json()
    assert "Dense Forest" in t3["current_geofences"][0]

    # Stage 4: Prolonged Inactivity
    r4 = client.post("/api/simulation/scenarios/trekking/stage", json={"action": "next"})
    assert r4.status_code == 200
    st4 = r4.json()
    assert st4["current_stage"] == 4
    t4 = client.get("/api/tourists/T-101").json()
    assert t4["inactivity_minutes"] >= 35.0

    # Stage 5: Environmental Deterioration
    r5 = client.post("/api/simulation/scenarios/trekking/stage", json={"action": "next"})
    assert r5.status_code == 200
    st5 = r5.json()
    assert st5["current_stage"] == 5
    t5 = client.get("/api/tourists/T-101").json()
    assert t5["risk_level"] in ["HIGH", "CRITICAL"]

    # Stage 6: Proactive Warning & Alert Logged
    r6 = client.post("/api/simulation/scenarios/trekking/stage", json={"action": "next"})
    assert r6.status_code == 200
    st6 = r6.json()
    assert st6["current_stage"] == 6

    # Stage 7: Human-Led Intervention (Unit Assigned & Dispatched)
    r7 = client.post("/api/simulation/scenarios/trekking/stage", json={"action": "next"})
    assert r7.status_code == 200
    st7 = r7.json()
    assert st7["current_stage"] == 7
    # Verify an incident is in TEAM_ASSIGNED or RESPONDING
    incidents = client.get("/api/incidents").json()
    active_inc = [i for i in incidents if i["tourist_id"] == "T-101"][0]
    assert active_inc["status"] in ["TEAM_ASSIGNED", "RESPONDING"]

    # Stage 8: Resolution
    r8 = client.post("/api/simulation/scenarios/trekking/stage", json={"action": "next"})
    assert r8.status_code == 200
    st8 = r8.json()
    assert st8["current_stage"] == 8
    resolved_inc = client.get(f"/api/incidents/{active_inc['incident_id']}").json()
    assert resolved_inc["status"] == "RESOLVED"
    t8 = client.get("/api/tourists/T-101").json()
    assert t8["risk_level"] == "LOW"

def test_tourist_safety_check_response():
    client = TestClient(app)
    # Stage 4 sets high inactivity on T-101
    client.post("/api/simulation/scenarios/trekking/stage", json={"action": "set_stage", "stage": 4})
    
    # Tourist responds "I'm safe"
    r = client.post("/api/tourists/T-101/safety-check", json={"is_safe": True, "message": "Enjoying the scenic view"})
    assert r.status_code == 200
    res = r.json()
    assert res["status"] == "safety_check_acknowledged"

    t = client.get("/api/tourists/T-101").json()
    assert t["inactivity_minutes"] == 0.0
    assert "Safety check confirmed safe" in t["last_assessment_reason"]
