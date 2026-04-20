const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  get:    path         => req('GET', path),
  post:   (path, body) => req('POST', path, body),
  put:    (path, body) => req('PUT', path, body),
  delete: path         => req('DELETE', path),
}
