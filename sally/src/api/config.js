const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const API_BASE_URL = trimTrailingSlash(rawBaseUrl);
export const API_URL = `${API_BASE_URL}/api`;
