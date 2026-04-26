from django.contrib import admin

from .models import AidZone, Citizen, Incident, Route, SafeZone

admin.site.register(Incident)
admin.site.register(SafeZone)
admin.site.register(AidZone)
admin.site.register(Route)
admin.site.register(Citizen)
