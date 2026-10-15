import pytest
from fastapi.testclient import TestClient
from app.main import app, sim_engine
from app.engine.models import Geofence, Coordinates

client = TestClient(app)

def test_list_geofences():
    res = client.get("/api/geofences")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 3

def test_create_custom_circle_geofence():
    payload = {
        "id": "gf_test_custom_precipice",
        "name": "Kala Chor Edge Watchpoint",
        "type": "circle",
        "category": "danger",
        "center": {"lat": 17.6650, "lon": 73.6920},
        "radius_meters": 200.0,
        "description": "Steep dropoff perimeter along western flank",
        "weather_hazard": "landslide_risk",
        "crowd_density": 0.0
    }
    res = client.post("/api/geofences", json=payload)
    assert res.status_code == 200
    created = res.json()
    assert created["id"] == "gf_test_custom_precipice"
    assert created["name"] == "Kala Chor Edge Watchpoint"
    assert created["category"] == "danger"
    assert created["center"]["lat"] == 17.6650

    # Verify present in list
    res_list = client.get("/api/geofences")
    ids = [g["id"] for g in res_list.json()]
    assert "gf_test_custom_precipice" in ids

def test_create_custom_polygon_geofence():
    payload = {
        "id": "gf_test_custom_poly",
        "name": "Bamnoli Marshland Zone",
        "type": "polygon",
        "category": "caution",
        "polygon_points": [
            {"lat": 17.720, "lon": 73.740},
            {"lat": 17.725, "lon": 73.740},
            {"lat": 17.725, "lon": 73.745},
            {"lat": 17.720, "lon": 73.745}
        ],
        "description": "Wetland boundary during high tide",
        "weather_hazard": "flash_flood"
    }
    res = client.post("/api/geofences", json=payload)
    assert res.status_code == 200
    created = res.json()
    assert created["type"] == "polygon"
    assert len(created["polygon_points"]) == 4

def test_delete_custom_geofence():
    # Delete the circle created earlier
    res = client.delete("/api/geofences/gf_test_custom_precipice")
    assert res.status_code == 200
    assert res.json()["deleted"] is True

    # Verify no longer present
    res_list = client.get("/api/geofences")
    ids = [g["id"] for g in res_list.json()]
    assert "gf_test_custom_precipice" not in ids

def test_reset_geofences():
    res = client.post("/api/geofences/reset")
    assert res.status_code == 200
    data = res.json()
    ids = [g["id"] for g in data]
    assert "gf_test_custom_poly" not in ids
    assert "gf_forest_danger" in ids
