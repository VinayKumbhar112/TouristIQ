import pytest
from fastapi.testclient import TestClient
from app.main import app, sim_engine

@pytest.fixture(autouse=True)
def reset_engine():
    # Reset simulation state before test
    sim_engine.store.clear_all()
    sim_engine.__init__(seed=42)

def test_scenario_normal_tourist():
    client = TestClient(app)
    # Normal tourist step
    r = client.post("/api/simulation/control", json={"action": "step"})
    assert r.status_code == 200

    r_t = client.get("/api/tourists/T-102")
    assert r_t.status_code == 200
    t = r_t.json()
    assert t["risk_level"] == "LOW"
    assert t["risk_score"] < 25.0
    assert "Normal" in t["last_assessment_reason"]

def test_scenario_trekking_risk_escalation():
    client = TestClient(app)
    # Trigger trekking escalation scenario on T-101
    r_trig = client.post("/api/simulation/scenarios/run", json={"scenario_name": "trekking_escalation", "tourist_id": "T-101"})
    assert r_trig.status_code == 200
    res = r_trig.json()
    assert res["tourist_risk_level"] in ["HIGH", "CRITICAL"]

    # Verify incident was created
    r_inc = client.get("/api/incidents")
    assert r_inc.status_code == 200
    incidents = r_inc.json()
    t101_incs = [i for i in incidents if i["tourist_id"] == "T-101"]
    assert len(t101_incs) == 1
    inc = t101_incs[0]
    assert inc["status"] == "NEW"
    assert inc["severity"] in ["HIGH", "CRITICAL"]

    # Verify transition: Acknowledge
    r_ack = client.post(f"/api/incidents/{inc['incident_id']}/acknowledge", json={"officer_id": "OFFICER-TEST", "note": "Acknowledged alert."})
    assert r_ack.status_code == 200
    assert r_ack.json()["status"] == "ACKNOWLEDGED"

    # Verify recommended units
    r_rec = client.get(f"/api/incidents/{inc['incident_id']}/recommended-units")
    assert r_rec.status_code == 200
    recs = r_rec.json()
    assert len(recs) > 0
    assigned_unit_id = recs[0]["unit"]["unit_id"]

    # Verify transition: Assign Unit
    r_assign = client.post(f"/api/incidents/{inc['incident_id']}/assign", json={"officer_id": "OFFICER-TEST", "unit_id": assigned_unit_id})
    assert r_assign.status_code == 200
    assert r_assign.json()["status"] == "TEAM_ASSIGNED"

    # Verify transition: Dispatch
    r_disp = client.post(f"/api/incidents/{inc['incident_id']}/dispatch", json={"officer_id": "OFFICER-TEST", "eta_minutes": 10})
    assert r_disp.status_code == 200
    assert r_disp.json()["status"] == "RESPONDING"

    # Verify transition: Resolve
    r_res = client.post(f"/api/incidents/{inc['incident_id']}/resolve", json={"officer_id": "OFFICER-TEST", "summary": "Tourist brought to safety."})
    assert r_res.status_code == 200
    assert r_res.json()["status"] == "RESOLVED"

def test_scenario_immediate_sos():
    client = TestClient(app)
    # Trigger SOS on T-105
    r_sos = client.post("/api/simulation/scenarios/run", json={"scenario_name": "sos_immediate", "tourist_id": "T-105"})
    assert r_sos.status_code == 200
    res = r_sos.json()
    assert res["tourist_risk_score"] == 100.0
    assert res["tourist_risk_level"] == "CRITICAL"

    r_inc = client.get("/api/incidents")
    incidents = r_inc.json()
    sos_incs = [i for i in incidents if i["tourist_id"] == "T-105"]
    assert len(sos_incs) == 1
    assert sos_incs[0]["type"] == "SOS_EMERGENCY"
    assert sos_incs[0]["severity"] == "CRITICAL"

def test_scenario_false_alarm_cafe_stop():
    client = TestClient(app)
    # Trigger cafe stop
    r_stop = client.post("/api/simulation/scenarios/run", json={"scenario_name": "false_alarm_cafe", "tourist_id": "T-103"})
    assert r_stop.status_code == 200

    # Tourist was stationary for 18 mins (Medium risk, not emergency)
    r_t = client.get("/api/tourists/T-103")
    t = r_t.json()
    assert t["risk_level"] in ["LOW", "MEDIUM"]
    assert t["risk_score"] < 50.0

def test_scenario_crowd_risk():
    client = TestClient(app)
    # Trigger crowd surge scenario
    r_crowd = client.post("/api/simulation/scenarios/run", json={"scenario_name": "crowd_surge"})
    assert r_crowd.status_code == 200

    r_inc = client.get("/api/incidents")
    incidents = r_inc.json()
    crowd_incs = [i for i in incidents if i["type"] == "CROWD_SURGE"]
    assert len(crowd_incs) >= 1
    c_inc = crowd_incs[0]
    assert c_inc["status"] == "NEW"
    assert "Bamnoli" in c_inc["tourist_name"]
    assert len(c_inc["evidence_breakdown"]["recommended_actions"]) > 0

def test_scenario_signal_loss():
    client = TestClient(app)
    r_sig = client.post("/api/simulation/scenarios/run", json={"scenario_name": "signal_loss", "tourist_id": "T-104"})
    assert r_sig.status_code == 200

    r_t = client.get("/api/tourists/T-104")
    t = r_t.json()
    assert t["is_signal_lost"] is True
    assert t["signal_delay_seconds"] >= 300.0
