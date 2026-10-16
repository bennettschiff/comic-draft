async function call(path, { method = "GET", body, keepalive } = {}) {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    keepalive,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status, data });
  return data;
}

export const api = {
  session: () => call("/api/session"),
  login: password => call("/api/login", { method: "POST", body: { password } }),
  logout: () => call("/api/logout", { method: "POST" }),
  pull: since => call(`/api/sync?since=${since}`),
  push: (docs, keepalive = false) => call("/api/sync", { method: "POST", body: { docs }, keepalive }),
};
