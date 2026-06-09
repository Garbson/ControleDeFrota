/**
 * Cliente HTTP base — gerencia tokens, refresh automático e erros.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

let accessToken = localStorage.getItem('cf_token') || ''
let refreshToken = localStorage.getItem('cf_refresh') || ''
let refreshPromise = null

function setTokens(at, rt) {
  accessToken = at
  refreshToken = rt
  localStorage.setItem('cf_token', at)
  localStorage.setItem('cf_refresh', rt)
}

function clearTokens() {
  accessToken = ''
  refreshToken = ''
  localStorage.removeItem('cf_token')
  localStorage.removeItem('cf_refresh')
}

function getAccessToken() {
  return accessToken
}

async function doRefresh() {
  if (!refreshToken) throw new Error('Sem refresh token')

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) {
    clearTokens()
    window.dispatchEvent(new Event('cf:logout'))
    throw new Error('Sessão expirada')
  }

  const data = await res.json()
  setTokens(data.accessToken, data.refreshToken)
  return data.accessToken
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const headers = { 'Content-Type': 'application/json', ...options.headers }

  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  let res = await fetch(url, { ...options, headers })

  // Token expirado — tenta refresh uma vez
  if (res.status === 401) {
    const body = await res.json().catch(() => ({}))
    if (body.code === 'TOKEN_EXPIRED') {
      if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => { refreshPromise = null })
      }
      try {
        const newToken = await refreshPromise
        headers['Authorization'] = `Bearer ${newToken}`
        res = await fetch(url, { ...options, headers })
      } catch {
        throw new Error('Sessão expirada. Faça login novamente.')
      }
    } else {
      throw new Error(body.error || 'Não autorizado')
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || err.message || 'Erro na requisição')
  }

  // 204 No Content
  if (res.status === 204) return null
  return res.json()
}

// Métodos HTTP
const api = {
  get:    (path, opts = {}) => request(path, { ...opts, method: 'GET' }),
  post:   (path, body, opts = {}) => request(path, { ...opts, method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body, opts = {}) => request(path, { ...opts, method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path, body, opts = {}) => request(path, { ...opts, method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path, opts = {}) => request(path, { ...opts, method: 'DELETE' }),
}

export { api, setTokens, clearTokens, getAccessToken }
