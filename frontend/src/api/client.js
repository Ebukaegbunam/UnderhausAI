const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8001'

function getToken() {
  return localStorage.getItem('uh_token')
}

async function req(method, path, body) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  get:    path          => req('GET', path),
  post:   (path, body)  => req('POST', path, body),
  put:    (path, body)  => req('PUT', path, body),
  delete: path          => req('DELETE', path),
}

export const auth = {
  setToken: (token) => localStorage.setItem('uh_token', token),
  clearToken: ()    => localStorage.removeItem('uh_token'),
  getToken,
  isLoggedIn: ()    => !!getToken(),
}
