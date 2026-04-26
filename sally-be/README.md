# Sally Backend (Django + DRF)

Backend for `sally/` (government) and `sally-app/` (citizen) frontends.

## Setup

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_mock_data
.venv/bin/python manage.py runserver
```

## API

- `GET/POST /api/incidents/`
- `GET /api/incidents/<id>/`
- `GET/POST /api/safezones/`
- `GET/POST /api/aidzones/`
- `POST /api/routes/generate/`
- `GET/POST /api/routes/`
- `GET/POST /api/citizens/`

## Request/response shapes

All locations use:

```json
{ "lat": 44.43, "lng": 26.10 }
```

### Create incident

```json
{
  "location": { "lat": 44.435, "lng": 26.102 },
  "incident_type": "fire",
  "base_radius_km": 0.5,
  "growth_per_hour_km": 0.08
}
```

### Generate route

```json
{
  "location": { "lat": 44.43, "lng": 26.10 }
}
```

Returns computed waypoints and nearest safezone while avoiding incident zones.

## Notes

- SQLite is used (`db.sqlite3`).
- Incident radius grows linearly with elapsed time.
- CORS allows all origins for easy frontend integration.
