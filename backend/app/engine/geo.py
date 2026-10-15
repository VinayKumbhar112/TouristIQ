from typing import List, Tuple, Dict, Any
import math

EARTH_RADIUS_METERS = 6371000.0

def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """
    Calculate the great-circle distance between two points on Earth in meters.
    coord: (lat, lon) in decimal degrees.
    """
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c

def distance_point_to_segment(p: Tuple[float, float], a: Tuple[float, float], b: Tuple[float, float]) -> float:
    """
    Compute shortest distance in meters from point p to segment ab on Earth.
    Approximated using local planar projection around segment for high precision over trekking scales.
    """
    lat_p, lon_p = p
    lat_a, lon_a = a
    lat_b, lon_b = b

    # Reference origin at 'a'
    mean_lat = math.radians((lat_a + lat_b + lat_p) / 3.0)
    kx = EARTH_RADIUS_METERS * math.cos(mean_lat) * (math.pi / 180.0)
    ky = EARTH_RADIUS_METERS * (math.pi / 180.0)

    # Convert to meters relative to a
    px = (lon_p - lon_a) * kx
    py = (lat_p - lat_a) * ky
    bx = (lon_b - lon_a) * kx
    by = (lat_b - lat_a) * ky

    seg_len_sq = bx * bx + by * by
    if seg_len_sq == 0.0:
        return math.sqrt(px * px + py * py)

    # Projection factor t of p onto segment ab
    t = max(0.0, min(1.0, (px * bx + py * by) / seg_len_sq))
    proj_x = t * bx
    proj_y = t * by

    dx = px - proj_x
    dy = py - proj_y
    return math.sqrt(dx * dx + dy * dy)

def distance_point_to_polyline(point: Tuple[float, float], polyline: List[Tuple[float, float]]) -> float:
    """
    Calculate minimum distance from a point to a polyline route in meters.
    """
    if not polyline:
        return 0.0
    if len(polyline) == 1:
        return haversine_distance(point, polyline[0])

    min_dist = float("inf")
    for i in range(len(polyline) - 1):
        dist = distance_point_to_segment(point, polyline[i], polyline[i + 1])
        if dist < min_dist:
            min_dist = dist
    return min_dist

def is_point_in_polygon(point: Tuple[float, float], polygon: List[Tuple[float, float]]) -> bool:
    """
    Ray-casting algorithm to determine if a point (lat, lon) is inside a polygon.
    polygon is a list of (lat, lon) tuples.
    """
    lat, lon = point
    n = len(polygon)
    if n < 3:
        return False

    inside = False
    p1_lat, p1_lon = polygon[0]
    for i in range(n + 1):
        p2_lat, p2_lon = polygon[i % n]
        if min(p1_lat, p2_lat) < lat <= max(p1_lat, p2_lat):
            if lon <= max(p1_lon, p2_lon):
                if p1_lat != p2_lat:
                    x_inters = (lat - p1_lat) * (p2_lon - p1_lon) / (p2_lat - p1_lat) + p1_lon
                    if p1_lon == p2_lon or lon <= x_inters:
                        inside = not inside
        p1_lat, p1_lon = p2_lat, p2_lon
    return inside

def is_point_in_circle(point: Tuple[float, float], center: Tuple[float, float], radius_meters: float) -> bool:
    """Check if point is within circle defined by center and radius in meters."""
    return haversine_distance(point, center) <= radius_meters
