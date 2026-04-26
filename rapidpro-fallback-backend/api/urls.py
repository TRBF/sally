from django.urls import path

from .views import (
    AidZoneListCreateView,
    CitizenListCreateView,
    EmergencyRequestDetailView,
    EmergencyRequestListCreateView,
    IncidentDetailView,
    IncidentListCreateView,
    RouteClearView,
    RouteGenerateView,
    RouteListCreateView,
    SafeZoneDetailView,
    SafeZoneListCreateView,
)

urlpatterns = [
    path("incidents/", IncidentListCreateView.as_view(), name="incident-list-create"),
    path("incidents/<int:pk>/", IncidentDetailView.as_view(), name="incident-detail"),
    path("safezones/", SafeZoneListCreateView.as_view(), name="safezone-list-create"),
    path("safezones/<int:pk>/", SafeZoneDetailView.as_view(), name="safezone-detail"),
    path("aidzones/", AidZoneListCreateView.as_view(), name="aidzone-list-create"),
    path("routes/clear/", RouteClearView.as_view(), name="route-clear"),
    path("routes/generate/", RouteGenerateView.as_view(), name="route-generate"),
    path("routes/", RouteListCreateView.as_view(), name="route-list-create"),
    path("citizens/", CitizenListCreateView.as_view(), name="citizen-list-create"),
    path(
        "emergencies/",
        EmergencyRequestListCreateView.as_view(),
        name="emergency-list-create",
    ),
    path(
        "emergencies/<int:pk>/",
        EmergencyRequestDetailView.as_view(),
        name="emergency-detail",
    ),
]
