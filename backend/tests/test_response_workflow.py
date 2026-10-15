import os
import pytest
from app.engine.models import TouristProfile, Coordinates, Incident
from app.engine.store import IncidentStore
from app.engine.workflow import ResponseWorkflowManager

@pytest.fixture
def clean_workflow(tmp_path):
    db_file = str(tmp_path / "test_incidents.json")
    store = IncidentStore(storage_path=db_file)
    wf = ResponseWorkflowManager(store=store)
    return wf, store

def test_incident_auto_creation_and_escalation(clean_workflow):
    wf, store = clean_workflow

    tourist = TouristProfile(
        tourist_id="T-201",
        name="Arjun Kapoor",
        nationality="Indian",
        age=29,
        persona_type="trekker",
        emergency_contact="+91-9999900000",
        digital_id_hash="0xdeadbeef",
        current_location=Coordinates(lat=32.2500, lon=77.1800)
    )

    # 1. Low risk does not trigger incident
    inc_none = wf.process_telemetry_risk(
        tourist=tourist,
        evidence={"route_deviation_meters": 100.0},
        score=15.0,
        level="LOW",
        reason="Normal stroll",
        current_time=1000.0
    )
    assert inc_none is None
    assert len(store.list_incidents()) == 0

    # 2. High risk triggers NEW incident
    inc1 = wf.process_telemetry_risk(
        tourist=tourist,
        evidence={"route_deviation_meters": 800.0, "inactivity_minutes": 35.0},
        score=58.0,
        level="HIGH",
        reason="Significant deviation and stationary",
        current_time=1100.0
    )
    assert inc1 is not None
    assert inc1.status == "NEW"
    assert inc1.severity == "HIGH"
    assert len(store.list_incidents()) == 1

    # 3. Subsequent worse telemetry escalates the existing incident (no duplicate created!)
    inc2 = wf.process_telemetry_risk(
        tourist=tourist,
        evidence={"route_deviation_meters": 1400.0, "inactivity_minutes": 65.0, "entered_danger_zone": True},
        score=88.0,
        level="CRITICAL",
        reason="Severe deviation, stationary in danger zone",
        current_time=1200.0
    )
    assert inc2.incident_id == inc1.incident_id
    assert inc2.severity == "CRITICAL"
    assert inc2.risk_score == 88.0
    assert len(store.list_incidents()) == 1
    # Check timeline records both creation and escalation
    actions = [item["action"] for item in inc2.timeline]
    assert "INCIDENT_TRIGGERED" in actions
    assert "RISK_ESCALATED" in actions

def test_complete_response_lifecycle(clean_workflow):
    wf, store = clean_workflow

    tourist = TouristProfile(
        tourist_id="T-202",
        name="Sara Jenkins",
        nationality="UK",
        age=32,
        persona_type="trekker",
        emergency_contact="+44-123456",
        digital_id_hash="0xabcd1234",
        current_location=Coordinates(lat=32.2600, lon=77.1700)
    )

    # Step 1: Create incident via SOS
    inc = wf.process_telemetry_risk(
        tourist=tourist,
        evidence={"is_sos": True},
        score=100.0,
        level="CRITICAL",
        reason="Manual SOS",
        current_time=2000.0
    )
    inc_id = inc.incident_id
    assert inc.status == "NEW"

    # Step 2: Officer acknowledges
    inc_ack = wf.acknowledge_incident(inc_id, officer_id="OFFICER-42", note="Investigating SOS distress broadcast", timestamp=2010.0)
    assert inc_ack.status == "ACKNOWLEDGED"

    # Step 3: Recommend nearest response unit
    rec_units = wf.get_recommended_units(inc_id)
    assert len(rec_units) > 0
    nearest = rec_units[0]
    assert nearest["unit"].status == "AVAILABLE"
    assigned_unit_id = nearest["unit"].unit_id

    # Step 4: Assign response unit
    inc_assign = wf.assign_response_unit(inc_id, unit_id=assigned_unit_id, officer_id="OFFICER-42", timestamp=2020.0)
    assert inc_assign.status == "TEAM_ASSIGNED"
    # Unit status in store is now DISPATCHED
    assert store.get_response_unit(assigned_unit_id).status == "DISPATCHED"

    # Step 5: Unit dispatch / responding
    inc_resp = wf.dispatch_unit_responding(inc_id, officer_id="OFFICER-42", eta_minutes=12, timestamp=2030.0)
    assert inc_resp.status == "RESPONDING"
    assert store.get_response_unit(assigned_unit_id).status == "ON_SCENE"

    # Step 6: Resolution
    inc_resolved = wf.resolve_incident(inc_id, officer_id="OFFICER-42", resolution_summary="Tourist located, first aid administered for minor ankle sprain, guided safely to trailhead.", timestamp=2100.0)
    assert inc_resolved.status == "RESOLVED"
    # Unit status in store is now back to AVAILABLE
    assert store.get_response_unit(assigned_unit_id).status == "AVAILABLE"

    # Verify complete timeline integrity
    expected_actions = ["INCIDENT_TRIGGERED", "ACKNOWLEDGED", "UNIT_ASSIGNED", "UNIT_EN_ROUTE", "INCIDENT_RESOLVED"]
    actual_actions = [item["action"] for item in inc_resolved.timeline]
    for action in expected_actions:
        assert action in actual_actions

def test_false_alarm_workflow(clean_workflow):
    wf, store = clean_workflow

    tourist = TouristProfile(
        tourist_id="T-203",
        name="Vikram Rao",
        nationality="Indian",
        age=35,
        persona_type="casual",
        emergency_contact="+91-98765",
        digital_id_hash="0x556677",
        current_location=Coordinates(lat=32.2400, lon=77.1850)
    )

    inc = wf.process_telemetry_risk(
        tourist=tourist,
        evidence={"inactivity_minutes": 35.0},
        score=52.0,
        level="HIGH",
        reason="Stationary alert",
        current_time=3000.0
    )

    # Officer confirms tourist is simply having lunch at roadside cafe
    inc_fa = wf.mark_false_alarm(inc.incident_id, officer_id="OFFICER-11", reason="Contacted tourist via mobile phone; confirmed resting at cafe, no assistance required.", timestamp=3050.0)
    assert inc_fa.status == "FALSE_ALARM"
    assert "Contacted tourist via mobile phone" in inc_fa.notes[-1]
