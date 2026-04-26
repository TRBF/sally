import heapq
import math
from typing import Dict, List, Optional, Set, Tuple

from django.utils import timezone

from .models import Incident, SafeZone

GridPoint = Tuple[int, int]


def _to_km(lat: float, lng: float, origin_lat: float) -> Tuple[float, float]:
    km_per_deg_lat = 111.0
    km_per_deg_lng = 111.0 * math.cos(math.radians(origin_lat))
    return lat * km_per_deg_lat, lng * km_per_deg_lng


def _distance_km(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    mean_lat = (a_lat + b_lat) / 2
    ax, ay = _to_km(a_lat, a_lng, mean_lat)
    bx, by = _to_km(b_lat, b_lng, mean_lat)
    return math.hypot(ax - bx, ay - by)


def _incident_radius_now(incident: Incident) -> float:
    elapsed_hours = max((timezone.now() - incident.created_at).total_seconds() / 3600, 0)
    return incident.base_radius_km + incident.growth_per_hour_km * elapsed_hours


def _nearest_safezone(user_lat: float, user_lng: float, safezones: List[SafeZone]) -> Optional[SafeZone]:
    if not safezones:
        return None
    return min(safezones, key=lambda sz: _distance_km(user_lat, user_lng, sz.lat, sz.lng))


def _incident_penalty_at_km(x_km: float, y_km: float, incidents_xy_radius: List[Tuple[float, float, float]]) -> float:
    penalty = 0.0
    for ix, iy, radius in incidents_xy_radius:
        dist = math.hypot(x_km - ix, y_km - iy)
        if dist <= radius:
            penalty += 1_000_000.0
            continue
        buffer = max(radius * 1.8, radius + 0.7)
        if dist <= buffer:
            penalty += ((buffer - dist) / max(buffer - radius, 0.001)) * 30.0
    return penalty


def _build_blocked_cells(
    incidents: List[Incident],
    origin_lat: float,
    origin_lng: float,
    min_x: float,
    min_y: float,
    cell_size_km: float,
    width: int,
    height: int,
) -> Set[GridPoint]:
    blocked: Set[GridPoint] = set()
    for incident in incidents:
        ix, iy = _to_km(incident.lat - origin_lat, incident.lng - origin_lng, origin_lat)
        radius = _incident_radius_now(incident) + 0.25
        grid_radius = int(math.ceil(radius / cell_size_km))
        cx = int(round((ix - min_x) / cell_size_km))
        cy = int(round((iy - min_y) / cell_size_km))
        for x in range(max(0, cx - grid_radius), min(width, cx + grid_radius + 1)):
            for y in range(max(0, cy - grid_radius), min(height, cy + grid_radius + 1)):
                gx = min_x + x * cell_size_km
                gy = min_y + y * cell_size_km
                if math.hypot(gx - ix, gy - iy) <= radius:
                    blocked.add((x, y))
    return blocked


def _astar(
    start: GridPoint,
    goal: GridPoint,
    blocked: Set[GridPoint],
    width: int,
    height: int,
    min_x: float,
    min_y: float,
    cell_size_km: float,
    incidents_xy_radius: List[Tuple[float, float, float]],
):
    def heuristic(a: GridPoint, b: GridPoint) -> float:
        return math.hypot(a[0] - b[0], a[1] - b[1])

    open_heap: List[Tuple[float, GridPoint]] = [(0, start)]
    g_score: Dict[GridPoint, float] = {start: 0}
    came_from: Dict[GridPoint, GridPoint] = {}

    directions = [
        (1, 0),
        (-1, 0),
        (0, 1),
        (0, -1),
        (1, 1),
        (1, -1),
        (-1, 1),
        (-1, -1),
    ]

    while open_heap:
        _, current = heapq.heappop(open_heap)
        if current == goal:
            path = [current]
            while current in came_from:
                current = came_from[current]
                path.append(current)
            return list(reversed(path))

        for dx, dy in directions:
            nx, ny = current[0] + dx, current[1] + dy
            if nx < 0 or nx >= width or ny < 0 or ny >= height:
                continue
            neighbor = (nx, ny)
            if neighbor in blocked:
                continue

            move_cost = math.sqrt(2) if dx != 0 and dy != 0 else 1
            gx = min_x + nx * cell_size_km
            gy = min_y + ny * cell_size_km
            risk_penalty = _incident_penalty_at_km(gx, gy, incidents_xy_radius)
            tentative_g = g_score[current] + move_cost + risk_penalty
            if tentative_g < g_score.get(neighbor, float("inf")):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score = tentative_g + heuristic(neighbor, goal)
                heapq.heappush(open_heap, (f_score, neighbor))
    return None


def generate_route(user_lat: float, user_lng: float, safezones: List[SafeZone], incidents: List[Incident]):
    if not safezones:
        return None, None
    best_route = None
    best_target = None
    best_cost = float("inf")
    nearest = _nearest_safezone(user_lat, user_lng, safezones)

    for target in safezones:
        mean_lat = (user_lat + target.lat) / 2
        sx, sy = _to_km(user_lat, user_lng, mean_lat)
        tx, ty = _to_km(target.lat, target.lng, mean_lat)

        margin_km = 3.0
        min_x = min(sx, tx) - margin_km
        max_x = max(sx, tx) + margin_km
        min_y = min(sy, ty) - margin_km
        max_y = max(sy, ty) + margin_km
        cell_size_km = 0.2

        width = max(10, int(math.ceil((max_x - min_x) / cell_size_km)) + 1)
        height = max(10, int(math.ceil((max_y - min_y) / cell_size_km)) + 1)

        def to_grid(x_km: float, y_km: float) -> GridPoint:
            return (
                int(round((x_km - min_x) / cell_size_km)),
                int(round((y_km - min_y) / cell_size_km)),
            )

        start = to_grid(sx, sy)
        goal = to_grid(tx, ty)

        incident_projection: List[Tuple[float, float, float]] = []
        for incident in incidents:
            ix, iy = _to_km(incident.lat, incident.lng, mean_lat)
            incident_projection.append((ix, iy, _incident_radius_now(incident)))

        blocked = _build_blocked_cells(
            incidents=incidents,
            origin_lat=0.0,
            origin_lng=0.0,
            min_x=min_x,
            min_y=min_y,
            cell_size_km=cell_size_km,
            width=width,
            height=height,
        )
        blocked.discard(start)
        blocked.discard(goal)

        path = _astar(
            start,
            goal,
            blocked,
            width,
            height,
            min_x,
            min_y,
            cell_size_km,
            incident_projection,
        )
        if path is None:
            continue

        route_cost = 0.0
        for x, y in path:
            px = min_x + x * cell_size_km
            py = min_y + y * cell_size_km
            route_cost += _incident_penalty_at_km(px, py, incident_projection)
        route_cost += len(path)
        if route_cost >= best_cost:
            continue

        km_per_deg_lat = 111.0
        km_per_deg_lng = 111.0 * math.cos(math.radians(mean_lat))
        points = []
        for x, y in path:
            px = min_x + x * cell_size_km
            py = min_y + y * cell_size_km
            lat = px / km_per_deg_lat
            lng = py / km_per_deg_lng
            points.append({"lat": round(lat, 6), "lng": round(lng, 6)})

        best_cost = route_cost
        best_route = points
        best_target = target

    if best_route is not None and best_target is not None:
        return best_route, best_target

    return None, nearest
