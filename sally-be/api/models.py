from django.db import models


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True


class Incident(TimestampedModel):
    FIRE = "fire"
    FLOOD = "flood"
    EARTHQUAKE = "earthquake"
    OTHER = "other"

    INCIDENT_TYPES = [
        (FIRE, "Fire"),
        (FLOOD, "Flood"),
        (EARTHQUAKE, "Earthquake"),
        (OTHER, "Other"),
    ]

    RISK_GRADES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    lat = models.FloatField()
    lng = models.FloatField()
    incident_type = models.CharField(max_length=32, choices=INCIDENT_TYPES)
    base_radius_km = models.FloatField(default=0.5)
    growth_per_hour_km = models.FloatField(default=0.1)
    risk_grade = models.CharField(max_length=16, choices=RISK_GRADES, default="high")
    # Travel restrictions, e.g. {"people": false, "car": true, "bicycle": false, "bus": true}
    restrictions = models.JSONField(default=dict, blank=True)

    def __str__(self) -> str:
        return f"{self.incident_type} at ({self.lat}, {self.lng})"


class SafeZone(models.Model):
    lat = models.FloatField()
    lng = models.FloatField()
    name = models.CharField(max_length=128)
    capacity = models.PositiveIntegerField(default=0)

    def __str__(self) -> str:
        return self.name


class AidZone(models.Model):
    MEDICAL = "medical"
    FOOD = "food"
    SHELTER = "shelter"

    AID_TYPES = [
        (MEDICAL, "Medical"),
        (FOOD, "Food"),
        (SHELTER, "Shelter"),
    ]

    lat = models.FloatField()
    lng = models.FloatField()
    name = models.CharField(max_length=128)
    aid_type = models.CharField(max_length=32, choices=AID_TYPES)

    def __str__(self) -> str:
        return self.name


class Route(models.Model):
    waypoints = models.JSONField(default=list)
    incident = models.ForeignKey(
        Incident, on_delete=models.SET_NULL, null=True, blank=True, related_name="routes"
    )
    safezone = models.ForeignKey(
        SafeZone, on_delete=models.SET_NULL, null=True, blank=True, related_name="routes"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Route {self.id}"


class Citizen(models.Model):
    SAFE = "safe"
    NEEDS_HELP = "needs_help"
    EVACUATING = "evacuating"
    UNKNOWN = "unknown"

    STATUS_CHOICES = [
        (SAFE, "Safe"),
        (NEEDS_HELP, "Needs Help"),
        (EVACUATING, "Evacuating"),
        (UNKNOWN, "Unknown"),
    ]

    name = models.CharField(max_length=128)
    lat = models.FloatField()
    lng = models.FloatField()
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=UNKNOWN)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name


class EmergencyRequest(TimestampedModel):
    """
    Emergency report submitted by a user (typically on behalf of a friend or
    family member). Surfaces in the government dashboard as a red exclamation
    marker so dispatchers can act on it.
    """

    TRAPPED = "trapped"
    MEDICAL = "medical"
    UNRESPONSIVE = "unresponsive"
    FIRE = "fire"
    FLOOD = "flood"
    OTHER = "other"

    EMERGENCY_TYPES = [
        (TRAPPED, "Trapped"),
        (MEDICAL, "Medical"),
        (UNRESPONSIVE, "Unresponsive"),
        (FIRE, "Fire"),
        (FLOOD, "Flood"),
        (OTHER, "Other"),
    ]

    name = models.CharField(max_length=128)
    contact_code = models.CharField(max_length=64, blank=True, default="")
    lat = models.FloatField()
    lng = models.FloatField()
    emergency_type = models.CharField(
        max_length=32, choices=EMERGENCY_TYPES, default=OTHER
    )
    description = models.TextField(blank=True, default="")
    reporter_name = models.CharField(max_length=128, blank=True, default="")
    resolved = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"{self.emergency_type} for {self.name} at ({self.lat}, {self.lng})"
