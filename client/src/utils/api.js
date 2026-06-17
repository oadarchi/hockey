// client/src/utils/api.js — all API calls

const BASE = "/api";

async function req(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Auth
export const auth = {
  status:  ()         => req("GET",  "/auth/status"),
  login:   (password) => req("POST", "/auth/login",  { password }),
  logout:  ()         => req("POST", "/auth/logout"),
};

// Seasons
export const seasons = {
  list:       ()                    => req("GET",    "/seasons"),
  create:     (body)                => req("POST",   "/seasons", body),
  standings:  (id)                  => req("GET",    `/seasons/${id}/standings`),
  remove:     (id)                  => req("DELETE", `/seasons/${id}`),
};

// Players
export const players = {
  list:    (season_id) => req("GET",    `/players${season_id ? `?season_id=${season_id}` : ""}`),
  add:     (body)      => req("POST",   "/players", body),
  addGuest:(body)      => req("POST",   "/players/guest", body),
  update:  (id, body)  => req("PATCH",  `/players/${id}`, body),
  remove:  (id)        => req("DELETE", `/players/${id}`),
  history: (id)        => req("GET",    `/players/${id}/history`),
};

// Games
export const games = {
  list:      (season_id) => req("GET",  `/games${season_id ? `?season_id=${season_id}` : ""}`),
  get:       (id)        => req("GET",  `/games/${id}`),
  update:    (id, body)  => req("PATCH", `/games/${id}`, body),
  saveTeams: (id, body)  => req("POST", `/games/${id}/teams`, body),
  saveResult:(id, body)  => req("POST", `/games/${id}/result`, body),
};
