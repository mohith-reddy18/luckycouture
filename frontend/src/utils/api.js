/**
 * Lightweight fetch wrapper for the Lucky Couture API.
 *
 * - Always sends/receives JSON.
 * - Reads the JWT token from localStorage ("lc_token") and attaches it as
 *   a Bearer header automatically so every caller stays clean.
 * - On non-2xx responses, throws a plain Error whose `message` contains the
 *   server's JSON `message` field (or a generic fallback) and whose `status`
 *   property carries the HTTP status code — ready to display in the UI.
 *
 * Usage:
 *   import api from "../utils/api";
 *   const data = await api.post("/api/auth/login", { email, password });
 */

const BASE = import.meta.env.VITE_API_URL || ""; // empty = Vite proxy in dev; set to Render URL in production

function getToken() {
  try {
    return localStorage.getItem("lc_token") || null;
  } catch {
    return null;
  }
}

function saveToken(token) {
  try {
    if (token) localStorage.setItem("lc_token", token);
    else localStorage.removeItem("lc_token");
  } catch { /* ignore */ }
}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include", // send the httpOnly cookie too
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let json;
  try {
    json = await res.json();
  } catch {
    if (!res.ok) throw Object.assign(new Error("Server error"), { status: res.status });
    return null;
  }

  if (!res.ok) {
    const err = new Error(json?.message || "Something went wrong");
    err.status = res.status;
    err.errors = json?.errors || [];
    throw err;
  }

  // Persist a fresh token if the server returns one in the body.
  if (json?.token) saveToken(json.token);

  return json;
}

const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  patch: (path, body) => request("PATCH", path, body),
  delete: (path) => request("DELETE", path),
  saveToken,
  getToken,
};

export default api;
