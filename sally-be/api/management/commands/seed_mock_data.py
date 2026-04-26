from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import AidZone, Citizen, Incident, SafeZone


class Command(BaseCommand):
    help = "Seed the database with mock incidents, safezones, and aid zones."

    def handle(self, *args, **options):
        Incident.objects.all().delete()
        SafeZone.objects.all().delete()
        AidZone.objects.all().delete()
        Citizen.objects.all().delete()

        now = timezone.now()
        i1 = Incident.objects.create(
            lat=44.435,
            lng=26.102,
            incident_type=Incident.FIRE,
            base_radius_km=0.5,
            growth_per_hour_km=0.08,
        )
        i2 = Incident.objects.create(
            lat=44.427,
            lng=26.085,
            incident_type=Incident.FLOOD,
            base_radius_km=0.6,
            growth_per_hour_km=0.06,
        )
        i3 = Incident.objects.create(
            lat=44.447,
            lng=26.13,
            incident_type=Incident.OTHER,
            base_radius_km=0.4,
            growth_per_hour_km=0.07,
        )
        Incident.objects.filter(pk=i1.pk).update(created_at=now - timezone.timedelta(hours=1))
        Incident.objects.filter(pk=i2.pk).update(created_at=now - timezone.timedelta(hours=2))
        Incident.objects.filter(pk=i3.pk).update(created_at=now - timezone.timedelta(minutes=20))

        # Keep zones empty by default; authorities add live zones from the government UI.
        SafeZone.objects.bulk_create([])
        AidZone.objects.bulk_create(
            [
                AidZone(
                    lat=44.432,
                    lng=26.095,
                    name="Central Aid Point",
                    aid_type=AidZone.MEDICAL,
                ),
                AidZone(
                    lat=44.450,
                    lng=26.11,
                    name="East Distribution Hub",
                    aid_type=AidZone.FOOD,
                ),
            ]
        )

        Citizen.objects.bulk_create(
            [
                Citizen(name="Citizen Alpha", lat=44.421, lng=26.12, status=Citizen.EVACUATING),
                Citizen(name="Citizen Bravo", lat=44.447, lng=26.089, status=Citizen.NEEDS_HELP),
                Citizen(name="Citizen Charlie", lat=44.458, lng=26.145, status=Citizen.SAFE),
            ]
        )
        self.stdout.write(self.style.SUCCESS("Mock data seeded successfully."))
