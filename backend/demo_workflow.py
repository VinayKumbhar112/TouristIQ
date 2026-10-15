"""
Milestone 2 Interactive Verification: Incident Response Workflow.
Demonstrates the full incident lifecycle:
DETECT/ESCALATE -> ACKNOWLEDGE -> RECOMMEND UNIT -> ASSIGN -> DISPATCH (RESPONDING) -> RESOLVE
"""

import time
from app.engine.store import IncidentStore
from app.engine.workflow import ResponseWorkflowManager
from app.engine.simulation import SimulationEngine

def main():
    print("=" * 80)
    print("SMART TOURIST SAFETY PLATFORM - INCIDENT RESPONSE WORKFLOW (MILESTONE 2)")
    print("=" * 80)

    # Initialize simulation with persistent workflow manager
    sim = SimulationEngine(seed=42)
    workflow = sim.workflow
    store = sim.store

    print(f"[*] Response units in service: {len(store.list_response_units())}")
    for u in store.list_response_units():
        print(f"    - [{u.unit_id}] {u.name} ({u.type}) - Status: {u.status}")

    # 1. Trigger incident via remote trekking risk on T-101
    print("\n--- STAGE 1: ANOMALY DETECTION & AUTOMATIC INCIDENT CREATION ---")
    sim.tourist_modes["T-101"] = "deviating"
    sim.step(delta_seconds=10.0)
    # Stop tourist in dangerous terrain for 40 minutes
    sim.tourist_modes["T-101"] = "stopped"
    sim.step(delta_seconds=2400.0)

    active_incidents = [i for i in store.list_incidents() if i.status not in ["RESOLVED", "FALSE_ALARM"]]
    print(f"[*] Active Incidents detected: {len(active_incidents)}")
    assert len(active_incidents) > 0
    incident = active_incidents[0]
    print(f"  Incident ID: {incident.incident_id}")
    print(f"  Tourist: {incident.tourist_name} ({incident.tourist_id})")
    print(f"  Type: {incident.type} | Severity: {incident.severity} | Risk Score: {incident.risk_score}")
    print(f"  Current Status: {incident.status}")
    print(f"  Location: ({incident.location.lat:.4f}, {incident.location.lon:.4f})")
    print(f"  Notes: {incident.notes}")

    # 2. Officer Acknowledgement
    print("\n--- STAGE 2: OFFICER ACKNOWLEDGEMENT ---")
    inc_ack = workflow.acknowledge_incident(
        incident_id=incident.incident_id,
        officer_id="OFFICER-SHARMA-09",
        note="Received critical alert. Reviewing tourist profile and weather radar."
    )
    print(f"  Status updated to: {inc_ack.status}")
    print(f"  Latest Note: {inc_ack.notes[-1]}")

    # 3. Intelligent Response Unit Recommendation
    print("\n--- STAGE 3: RECOMMENDED RESPONSE UNITS (BY PROXIMITY) ---")
    recommendations = workflow.get_recommended_units(incident.incident_id)
    for idx, rec in enumerate(recommendations, 1):
        u = rec["unit"]
        print(f"  {idx}. {u.name} ({u.type}) - Dist: {rec['distance_km']} km | Status: {u.status}")
    
    selected_unit = recommendations[0]["unit"]
    print(f"  -> Selecting closest available unit: {selected_unit.name}")

    # 4. Unit Assignment
    print("\n--- STAGE 4: UNIT ASSIGNMENT ---")
    inc_assigned = workflow.assign_response_unit(
        incident_id=incident.incident_id,
        unit_id=selected_unit.unit_id,
        officer_id="OFFICER-SHARMA-09"
    )
    print(f"  Status updated to: {inc_assigned.status}")
    print(f"  Assigned Unit ID: {inc_assigned.assigned_unit_id}")
    print(f"  Unit status in registry: {store.get_response_unit(selected_unit.unit_id).status}")

    # 5. Unit En Route / Responding
    print("\n--- STAGE 5: DISPATCH & RESPONDING ---")
    inc_resp = workflow.dispatch_unit_responding(
        incident_id=incident.incident_id,
        officer_id="OFFICER-SHARMA-09",
        eta_minutes=14
    )
    print(f"  Status updated to: {inc_resp.status}")
    print(f"  Unit status in registry: {store.get_response_unit(selected_unit.unit_id).status}")

    # 6. Resolution
    print("\n--- STAGE 6: INCIDENT RESOLUTION ---")
    inc_resolved = workflow.resolve_incident(
        incident_id=incident.incident_id,
        officer_id="OFFICER-SHARMA-09",
        resolution_summary="Rescue Squad reached tourist. Tourist warmed, given hydration, assisted back to Solang Base Camp."
    )
    print(f"  Final Status: {inc_resolved.status}")
    print(f"  Unit status after release: {store.get_response_unit(selected_unit.unit_id).status}")

    # 7. Complete Audit Trail / Timeline
    print("\n--- STAGE 7: IMMUTABLE AUDIT TIMELINE ---")
    for step in inc_resolved.timeline:
        print(f"  [{time.ctime(step['timestamp'])}] Action: {step['action']:<20} | By: {step.get('actor', 'SYS'):<18} | Status: {step.get('from_status')} -> {step.get('to_status')}")

    print("\n" + "=" * 80)
    print("MILESTONE 2 RESPONSE WORKFLOW VERIFIED SUCCESSFULLY.")
    print("=" * 80)

if __name__ == "__main__":
    main()
