const BASE = import.meta.env.VITE_BASE_URL;

export const api = {
  list: () => fetch(`${BASE}/api/files`).then((r) => r.json()),
  create: (name, language) =>
    fetch(`${BASE}/api/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, language }),
    }).then((r) => r.json()),
  get: (id) => fetch(`${BASE}/api/files/${id}`).then((r) => r.json()),
};
export const SOCKET_URL = BASE;
