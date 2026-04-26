from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AidZone, Citizen, EmergencyRequest, Incident, Route, SafeZone
from .pathfinding import generate_route
from .serializers import (
    AidZoneSerializer,
    CitizenSerializer,
    EmergencyRequestSerializer,
    IncidentSerializer,
    RouteSerializer,
    SafeZoneSerializer,
)


class IncidentListCreateView(generics.ListCreateAPIView):
    queryset = Incident.objects.order_by("-created_at")
    serializer_class = IncidentSerializer


class IncidentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Incident.objects.all()
    serializer_class = IncidentSerializer


class SafeZoneListCreateView(generics.ListCreateAPIView):
    queryset = SafeZone.objects.all()
    serializer_class = SafeZoneSerializer


class SafeZoneDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SafeZone.objects.all()
    serializer_class = SafeZoneSerializer


class EmergencyRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = EmergencyRequestSerializer

    def get_queryset(self):
        qs = EmergencyRequest.objects.order_by("-created_at")
        resolved_param = self.request.query_params.get("resolved")
        if resolved_param is not None:
            value = resolved_param.lower() in ("1", "true", "yes")
            qs = qs.filter(resolved=value)
        return qs


class EmergencyRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = EmergencyRequest.objects.all()
    serializer_class = EmergencyRequestSerializer


class AidZoneListCreateView(generics.ListCreateAPIView):
    queryset = AidZone.objects.all()
    serializer_class = AidZoneSerializer


class RouteListCreateView(generics.ListCreateAPIView):
    queryset = Route.objects.order_by("-created_at")
    serializer_class = RouteSerializer


class RouteClearView(APIView):
    def delete(self, request):
        deleted, _ = Route.objects.all().delete()
        return Response({"deleted": deleted}, status=status.HTTP_200_OK)


class RouteGenerateView(APIView):
    def post(self, request):
        location = request.data.get("location", {})
        user_lat = location.get("lat")
        user_lng = location.get("lng")

        if user_lat is None or user_lng is None:
            return Response(
                {"detail": "Request must include location.lat and location.lng"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        incidents = list(Incident.objects.all())
        safezones = list(SafeZone.objects.all())
        waypoints, safezone = generate_route(
            user_lat=float(user_lat),
            user_lng=float(user_lng),
            safezones=safezones,
            incidents=incidents,
        )

        if safezone is None:
            return Response(
                {"detail": "No safezone available."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if waypoints is None:
            return Response(
                {"detail": "No route found that avoids all incident zones."},
                status=status.HTTP_409_CONFLICT,
            )

        response_data = {
            "safezone": SafeZoneSerializer(safezone).data,
            "waypoints": waypoints,
        }
        return Response(response_data, status=status.HTTP_200_OK)


class CitizenListCreateView(generics.ListCreateAPIView):
    queryset = Citizen.objects.order_by("-updated_at")
    serializer_class = CitizenSerializer
