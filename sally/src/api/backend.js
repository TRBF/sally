import { API_URL } from "./config";

const extraHeaders = API_URL.includes(".ngrok-free.app")
  ? { "ngrok-skip-browser-warning": "true" }
  : {};

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function listIncidents() {
  return request("/incidents/");
}

export function createIncident(payload) {
  return request("/incidents/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateIncident(id, payload) {
  return request(`/incidents/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function listSafeZones() {
  return request("/safezones/");
}

export function createSafeZone(payload) {
  return request("/safezones/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSafeZone(id, payload) {
  return request(`/safezones/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function listEmergencies({ resolved } = {}) {
  const query = resolved !== undefined ? `?resolved=${resolved}` : "";
  return request(`/emergencies/${query}`);
}

export function createEmergency(payload) {
  return request("/emergencies/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resolveEmergency(id) {
  return request(`/emergencies/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ resolved: true }),
  });
}

export function listAidZones() {
  return request("/aidzones/");
}

export function listCitizens() {
  return request("/citizens/");
}

export function listRoutes() {
  return request("/routes/");
}

export function createManualRoute(payload) {
  return request("/routes/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function clearAllRoutes() {
  return request("/routes/clear/", { method: "DELETE" });
}

export function deleteIncident(id) {
  return request(`/incidents/${id}/`, {
    method: "DELETE",
  });
}

export function deleteSafeZone(id) {
  return request(`/safezones/${id}/`, {
    method: "DELETE",
  });
}
