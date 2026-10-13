const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

async function request(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || `API request failed (${response.status})`);
  }
  return response.json();
}

export const getDashboard = () => request("/dashboard");
export const getStates = () => request("/states");
export const getReviews = () => request("/reviews");
export const getDeliveries = (params = {}) =>
  request(`/deliveries?${new URLSearchParams(params).toString()}`);
export const getCities = () => request("/cities");
