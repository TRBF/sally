from django.utils import timezone
from rest_framework import serializers

from .models import AidZone, Citizen, EmergencyRequest, Incident, Route, SafeZone


class IncidentSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()
    radius_km = serializers.SerializerMethodField()
    lat = serializers.FloatField(write_only=True, required=False)
    lng = serializers.FloatField(write_only=True, required=False)

    class Meta:
        model = Incident
        fields = [
            "id",
            "location",
            "lat",
            "lng",
            "incident_type",
            "base_radius_km",
            "growth_per_hour_km",
            "risk_grade",
            "restrictions",
            "radius_km",
            "created_at",
        ]
        read_only_fields = ["created_at", "radius_km"]

    def get_location(self, obj: Incident):
        return {"lat": obj.lat, "lng": obj.lng}

    def get_radius_km(self, obj: Incident) -> float:
        elapsed = timezone.now() - obj.created_at
        elapsed_hours = max(elapsed.total_seconds() / 3600, 0)
        return round(obj.base_radius_km + (obj.growth_per_hour_km * elapsed_hours), 3)

    def create(self, validated_data):
        return Incident.objects.create(**validated_data)

    def to_internal_value(self, data):
        copied = data.copy()
        location = copied.pop("location", None)
        if location:
            copied["lat"] = location.get("lat")
            copied["lng"] = location.get("lng")
        return super().to_internal_value(copied)


class SafeZoneSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()
    lat = serializers.FloatField(write_only=True, required=False)
    lng = serializers.FloatField(write_only=True, required=False)

    class Meta:
        model = SafeZone
        fields = ["id", "location", "lat", "lng", "name", "capacity"]

    def get_location(self, obj: SafeZone):
        return {"lat": obj.lat, "lng": obj.lng}

    def to_internal_value(self, data):
        copied = data.copy()
        location = copied.pop("location", None)
        if location:
            copied["lat"] = location.get("lat")
            copied["lng"] = location.get("lng")
        return super().to_internal_value(copied)


class AidZoneSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()
    lat = serializers.FloatField(write_only=True, required=False)
    lng = serializers.FloatField(write_only=True, required=False)

    class Meta:
        model = AidZone
        fields = ["id", "location", "lat", "lng", "name", "aid_type"]

    def get_location(self, obj: AidZone):
        return {"lat": obj.lat, "lng": obj.lng}

    def to_internal_value(self, data):
        copied = data.copy()
        location = copied.pop("location", None)
        if location:
            copied["lat"] = location.get("lat")
            copied["lng"] = location.get("lng")
        return super().to_internal_value(copied)


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = ["id", "waypoints", "incident", "safezone", "created_at"]
        read_only_fields = ["created_at"]


class CitizenSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()
    lat = serializers.FloatField(write_only=True, required=False)
    lng = serializers.FloatField(write_only=True, required=False)

    class Meta:
        model = Citizen
        fields = ["id", "name", "location", "lat", "lng", "status", "updated_at"]
        read_only_fields = ["updated_at"]

    def get_location(self, obj: Citizen):
        return {"lat": obj.lat, "lng": obj.lng}

    def to_internal_value(self, data):
        copied = data.copy()
        location = copied.pop("location", None)
        if location:
            copied["lat"] = location.get("lat")
            copied["lng"] = location.get("lng")
        return super().to_internal_value(copied)


class EmergencyRequestSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()
    lat = serializers.FloatField(write_only=True, required=False)
    lng = serializers.FloatField(write_only=True, required=False)

    class Meta:
        model = EmergencyRequest
        fields = [
            "id",
            "name",
            "contact_code",
            "location",
            "lat",
            "lng",
            "emergency_type",
            "description",
            "reporter_name",
            "resolved",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_location(self, obj: EmergencyRequest):
        return {"lat": obj.lat, "lng": obj.lng}

    def to_internal_value(self, data):
        copied = data.copy()
        location = copied.pop("location", None)
        if location:
            copied["lat"] = location.get("lat")
            copied["lng"] = location.get("lng")
        return super().to_internal_value(copied)
