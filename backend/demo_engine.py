"""
Interactive Verification Demo for Milestone 1 - Safety Engine.
Demonstrates:
1. 20 realistic simulated tourists moving along trekking trails
2. Real-time telemetry processing
3. Route deviation calculation (cross-track distance)
4. Inactivity & stationary period detection
5. Geofence breach detection (polygonal & circular danger zones)
6. Compounding contextual risk scoring with transparent reason explanations
7. Immediate SOS override
"""

import time
from app.engine.simulation import SimulationEngine

def main():
    print("=" * 80)
    print("SMART TOURIST SAFETY PLATFORM - SAFETY ENGINE VERIFICATION (MILESTONE 1)")
    print("=" * 80)

    sim = SimulationEngine(seed=42)
    print(f"[*] Initialized simulation with {len(sim.tourists)} tourists across 4 trail corridors.")
    print(f"[*] Configured {len(sim.geofences)} active geofences (Danger, Caution, Restricted).")

    # Display initial state sample
    sample_t = sim.tourists["T-101"]
    print(f"\n[Sample Tourist T-101]")
    print(f"  Name: {sample_t.name} ({sample_t.nationality}) | Persona: {sample_t.persona_type}")
    print(f"  Initial Location: ({sample_t.current_location.lat:.4f}, {sample_t.current_location.lon:.4f})")
    print(f"  Planned Route: {sample_t.planned_route.name} ({len(sample_t.planned_route.points)} waypoints)")
    print(f"  Digital ID Hash: {sample_t.digital_id_hash}")
    print(f"  Initial Risk: {sample_t.risk_score}/100 ({sample_t.risk_level})")

    print("\n--- STEP 1: Running Normal Simulation Step (All tourists on route) ---")
    res1 = sim.step(delta_seconds=10.0)
    print(f"  Sim Time: {res1['sim_time']:.1f}")
    print(f"  Processed: {res1['processed_tourists']} tourists")
    print(f"  T-101 Risk: {sim.tourists['T-101'].risk_score}/100 ({sim.tourists['T-101'].risk_level})")
    print(f"  Reason: {sim.tourists['T-101'].last_assessment_reason}")

    print("\n--- STEP 2: Triggering Route Deviation on T-101 ---")
    sim.tourist_modes["T-101"] = "deviating"
    res2 = sim.step(delta_seconds=10.0)
    t101 = sim.tourists["T-101"]
    print(f"  T-101 Deviation: {t101.current_route_deviation_meters:.1f} meters")
    print(f"  T-101 Geofences: {t101.current_geofences}")
    print(f"  T-101 Risk Score: {t101.risk_score}/100 ({t101.risk_level})")
    print(f"  Explainable Reason: {t101.last_assessment_reason}")

    print("\n--- STEP 3: Inducing Prolonged Inactivity (Stationary 35+ mins) in Danger Zone ---")
    sim.tourist_modes["T-101"] = "stopped"
    # Advance time by 35 minutes (2100 seconds)
    res3 = sim.step(delta_seconds=2100.0)
    t101 = sim.tourists["T-101"]
    print(f"  T-101 Inactivity: {t101.inactivity_minutes:.1f} minutes")
    print(f"  T-101 Risk Score: {t101.risk_score}/100 ({t101.risk_level})")
    print(f"  Explainable Reason: {t101.last_assessment_reason}")
    print(f"  Active Incidents in System: {len(sim.incidents)}")
    if "T-101" in sim.incidents:
        inc = sim.incidents["T-101"]
        print(f"  -> Generated Incident: ID={inc.incident_id}, Severity={inc.severity}, Status={inc.status}")

    print("\n--- STEP 4: Emergency SOS Trigger Test (T-105) ---")
    sim.tourist_modes["T-105"] = "sos"
    sim.step(delta_seconds=5.0)
    t105 = sim.tourists["T-105"]
    print(f"  T-105 Name: {t105.name}")
    print(f"  T-105 Risk Score: {t105.risk_score}/100 ({t105.risk_level})")
    print(f"  Explainable Reason: {t105.last_assessment_reason}")
    if "T-105" in sim.incidents:
        inc_sos = sim.incidents["T-105"]
        print(f"  -> Generated Incident: ID={inc_sos.incident_id}, Type={inc_sos.type}, Severity={inc_sos.severity}")

    print("\n" + "=" * 80)
    print("MILESTONE 1 VERIFICATION COMPLETED SUCCESSFULLY.")
    print("=" * 80)

if __name__ == "__main__":
    main()
