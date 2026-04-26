from django.test import TestCase
from django.utils import timezone

from api.models import Incident, SafeZone


class IncidentRadiusTests(TestCase):
    def test_radius_grows_linearly(self):
        incident = Incident.objects.create(
            lat=44.0,
            lng=26.0,
            incident_type=Incident.FIRE,
            base_radius_km=1.0,
            growth_per_hour_km=0.5,
        )
        Incident.objects.filter(pk=incident.pk).update(
            created_at=timezone.now() - timezone.timedelta(hours=2)
        )
        response = self.client.get(f"/api/incidents/{incident.pk}/")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.json()["radius_km"], 2.0)


class RouteGenerateTests(TestCase):
    def test_generate_route_returns_waypoints(self):
        SafeZone.objects.create(name="SZ", lat=44.01, lng=26.01, capacity=50)
        response = self.client.post(
            "/api/routes/generate/",
            data={"location": {"lat": 44.0, "lng": 26.0}},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("waypoints", body)
        self.assertGreater(len(body["waypoints"]), 0)
