#!/usr/bin/env bash
# Start Sally backend, government (Vite) + citizen (Expo) dev servers, and ngrok
# HTTP tunnels. Frontends get EXPO_PUBLIC_API_BASE_URL / VITE_API_BASE_URL set to
# the public backend URL before they start.
#
# Requires: ngrok (logged in; run `ngrok update` if the agent is rejected), Node/npm, Python, curl.
# Free ngrok: only one online endpoint is allowed; use --backend-only or upgrade
# the account if you need three simultaneous tunnels.
#
# Usage: ./dev-ngrok.sh           # three tunnels (if your plan allows)
#        ./dev-ngrok.sh --backend-only   # only API + one ngrok; print local dev URLs
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
SALLY_PORT="${SALLY_PORT:-5173}"
EXPO_PORT="${EXPO_PORT:-8081}"
NGROK_MAIN="${XDG_CONFIG_HOME:-$HOME/.config}/ngrok/ngrok.yml"

BACKEND_ONLY=0
if [[ "${1:-}" == "--backend-only" ]]; then
  BACKEND_ONLY=1
fi

make_web_fragment() {
  local web_port=$1
  local f
  f="$(mktemp "${TMPDIR:-/tmp}/ngrok-web-XXXXXX.yaml")"
  cat >"$f" <<EOF
version: "3"
agent:
  web_addr: 127.0.0.1:${web_port}
EOF
  echo "$f"
}

# Return 0 if something is accepting TCP on 127.0.0.1:port.
port_listening() {
  local p=$1
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$p" 2>/dev/null
    return
  fi
  timeout 0.15 bash -c "echo 2> /dev/tcp/127.0.0.1/${p}" 2>/dev/null
}

# Parse https public URL for an ngrok agent (local API on 127.0.0.1:web_port).
get_ngrok_public_url() {
  local web_port=$1
  local raw
  raw="$(curl -fsS "http://127.0.0.1:${web_port}/api/tunnels" 2>/dev/null || true)"
  if [[ -z "$raw" ]]; then
    echo ""
    return 0
  fi
  # Prefer https endpoint (ngrok exposes one http + one https for same name).
  python3 -c '
import json, sys
raw = sys.stdin.read()
d = json.loads(raw)
tunnels = d.get("tunnels", [])
def pick():
    for t in tunnels:
        u = t.get("public_url") or ""
        if u.startswith("https:"):
            return u
    for t in tunnels:
        u = t.get("public_url") or ""
        if u.startswith("http:"):
            return u
    return ""
print(pick(), end="")
' <<<"$raw"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "error: need '$1' on PATH" >&2
    exit 1
  }
}

PIDS=()
CLEANUP_FRAGS=()
FRAG0=""
FRAG1=""
FRAG2=""

on_exit() {
  set +e
  for p in "${PIDS[@]:-}"; do
    kill "$p" 2>/dev/null
  done
  wait 2>/dev/null
  for f in "${CLEANUP_FRAGS[@]:-}"; do
    [[ -n "$f" && -f "$f" ]] && rm -f "$f"
  done
}
trap on_exit EXIT INT TERM

require_cmd curl
require_cmd ngrok
require_cmd python3
require_cmd npm
if [[ ! -f "$NGROK_MAIN" ]]; then
  echo "error: expected ngrok config with authtoken: $NGROK_MAIN" >&2
  echo "  Install: ngrok config add-authtoken <token>" >&2
  exit 1
fi

# --- Backend Python ---
BE_DIR="${ROOT}/sally-be"
PYTHON=python3
if [[ -x "${BE_DIR}/.venv/bin/python" ]]; then
  PYTHON="${BE_DIR}/.venv/bin/python"
elif [[ -x "${BE_DIR}/venv/bin/python" ]]; then
  PYTHON="${BE_DIR}/venv/bin/python"
fi

# --- 1) Django on BACKEND_PORT ---
(
  cd "$BE_DIR" && exec "$PYTHON" manage.py runserver "127.0.0.1:${BACKEND_PORT}"
) &
DJ_PID=$!
PIDS+=("$DJ_PID")
echo "[dev-ngrok] Django: http://127.0.0.1:${BACKEND_PORT}/"

# Wait for API
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${BACKEND_PORT}/api/incidents/" -o /dev/null 2>/dev/null; then
    break
  fi
  if ! kill -0 "$DJ_PID" 2>/dev/null; then
    echo "error: Django exited before listening." >&2
    exit 1
  fi
  sleep 0.3
done

# --- 2) ngrok to backend, resolve public base URL for frontends ---
FRAG0="$(make_web_fragment 4040)"
CLEANUP_FRAGS+=("$FRAG0")
ngrok http "127.0.0.1:${BACKEND_PORT}" --config="$NGROK_MAIN" --config="$FRAG0" --log=stdout &
NGBE_PID=$!
PIDS+=("$NGBE_PID")
echo "[dev-ngrok] ngrok (backend) PID ${NGBE_PID}; Web UI: http://127.0.0.1:4040/"

BACKEND_URL=""
for _ in $(seq 1 60); do
  BACKEND_URL="$(get_ngrok_public_url 4040)"
  if [[ -n "$BACKEND_URL" ]]; then
    break
  fi
  if ! kill -0 "$NGBE_PID" 2>/dev/null; then
    echo "error: ngrok (backend) exited; see ngrok log above (try: ngrok update). Web UI: http://127.0.0.1:4040/" >&2
    exit 1
  fi
  sleep 0.4
done
if [[ -z "$BACKEND_URL" ]]; then
  echo "error: no ngrok tunnel URL (inspect http://127.0.0.1:4040/)" >&2
  exit 1
fi
# Strip trailing slash for consistency with the apps.
BACKEND_URL="${BACKEND_URL%/}"
echo "[dev-ngrok] API base  (public): ${BACKEND_URL}"
echo "[dev-ngrok] Frontends will use this as the backend base URL."

# --- 3) Sally (Vite) with tunneled API URL ---
SALLY_DIR="${ROOT}/sally"
(
  cd "$SALLY_DIR"
  export VITE_API_BASE_URL="$BACKEND_URL"
  exec env BROWSER=none npm run dev -- --port "$SALLY_PORT" --host 127.0.0.1
) &
SALLY_DEV_PID=$!
PIDS+=("$SALLY_DEV_PID")

# --- 4) Sally-app (Expo) with tunneled API URL ---
SALLYAPP_DIR="${ROOT}/sally-app"
(
  cd "$SALLYAPP_DIR"
  export EXPO_PUBLIC_API_BASE_URL="$BACKEND_URL"
  exec env BROWSER=none EXPO_NO_TELEMETRY=1 npm run start -- -p "$EXPO_PORT" --host localhost
) &
EXPO_DEV_PID=$!
PIDS+=("$EXPO_DEV_PID")

for _ in $(seq 1 90); do
  if curl -fsS "http://127.0.0.1:${SALLY_PORT}/" -o /dev/null 2>/dev/null; then
    break
  fi
  if ! kill -0 "$SALLY_DEV_PID" 2>/dev/null; then
    break
  fi
  sleep 0.3
done
if ! curl -fsS "http://127.0.0.1:${SALLY_PORT}/" -o /dev/null 2>/dev/null; then
  echo "warn: Vite not responding on ${SALLY_PORT} (still starting?)" >&2
fi
for _ in $(seq 1 120); do
  if port_listening "$EXPO_PORT"; then
    break
  fi
  if ! kill -0 "$EXPO_DEV_PID" 2>/dev/null; then
    break
  fi
  sleep 0.3
done

SALLY_URL_LOCAL="http://127.0.0.1:${SALLY_PORT}/"
EXPO_URL_LOCAL="http://127.0.0.1:${EXPO_PORT}/"

if [[ "$BACKEND_ONLY" -eq 1 ]]; then
  echo ""
  echo "== Backend-only mode (one ngrok tunnel) =="
  echo "  API (ngrok):    ${BACKEND_URL}"
  echo "  Government UI:  ${SALLY_URL_LOCAL}  (connect here from this machine; uses API URL above in bundle)"
  echo "  Expo:           ${EXPO_URL_LOCAL}"
  echo ""
  wait
  exit 0
fi

# --- 5) ngrok to Vite + Expo (separate local inspect API ports) ---
FRAG1="$(make_web_fragment 4041)"
FRAG2="$(make_web_fragment 4042)"
CLEANUP_FRAGS+=("$FRAG1" "$FRAG2")
ngrok http "127.0.0.1:${SALLY_PORT}" --config="$NGROK_MAIN" --config="$FRAG1" --log=stdout &
NGS_PID=$!
PIDS+=("$NGS_PID")
echo "[dev-ngrok] ngrok (sally / Vite) PID ${NGS_PID}; Web UI: http://127.0.0.1:4041/"

sleep 0.3
ngrok http "127.0.0.1:${EXPO_PORT}" --config="$NGROK_MAIN" --config="$FRAG2" --log=stdout &
NGA_PID=$!
PIDS+=("$NGA_PID")
echo "[dev-ngrok] ngrok (sally-app / Metro) PID ${NGA_PID}; Web UI: http://127.0.0.1:4042/"

SALLY_PUBLIC=""
EXPO_PUBLIC_URL=""
for _ in $(seq 1 50); do
  SALLY_PUBLIC="$(get_ngrok_public_url 4041)"
  EXPO_PUBLIC_URL="$(get_ngrok_public_url 4042)"
  if [[ -n "$SALLY_PUBLIC" && -n "$EXPO_PUBLIC_URL" ]]; then
    break
  fi
  if ! kill -0 "$NGS_PID" 2>/dev/null || ! kill -0 "$NGA_PID" 2>/dev/null; then
    break
  fi
  sleep 0.4
done
if [[ -z "$SALLY_PUBLIC" || -z "$EXPO_PUBLIC_URL" ]]; then
  echo ""
  echo "warn: second/third ngrok tunnel did not get public URLs. Free plans allow only 1 online endpoint; use --backend-only" >&2
  echo "  local Vite: ${SALLY_URL_LOCAL}"
  echo "  local Expo: ${EXPO_URL_LOCAL}"
else
  SALLY_PUBLIC="${SALLY_PUBLIC%/}"
  EXPO_PUBLIC_URL="${EXPO_PUBLIC_URL%/}"
fi

echo ""
echo "== Sally dev (ngrok) =="
echo "  Backend (API):      ${BACKEND_URL}"
if [[ -n "$SALLY_PUBLIC" ]]; then
  echo "  Government (Vite):  ${SALLY_PUBLIC}  (local: ${SALLY_URL_LOCAL})"
  echo "  Expo / Metro:       ${EXPO_PUBLIC_URL}  (local: ${EXPO_URL_LOCAL})"
else
  echo "  Government (Vite):  ${SALLY_URL_LOCAL}"
  echo "  Expo / Metro:       ${EXPO_URL_LOCAL}"
fi
echo ""
echo "Press Ctrl+C to stop all processes."
wait
