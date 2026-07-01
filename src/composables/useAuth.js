import { computed, ref } from 'vue'
import { api, clearTokens, setTokens } from './useApi'

const user = ref(JSON.parse(localStorage.getItem('cf_user') || 'null'))
const loading = ref(false)
const error = ref('')

const isAuthenticated = computed(() => !!user.value)
const isAdmin = computed(() => user.value?.role === 'admin')

function setUser(u) {
  user.value = u
  if (u) localStorage.setItem('cf_user', JSON.stringify(u))
  else localStorage.removeItem('cf_user')
}

async function login(email, password) {
  loading.value = true
  error.value = ''
  try {
    const data = await api.post('/auth/login', { email, password })
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    return true
  } catch (err) {
    error.value = err.message || 'Erro ao fazer login'
    return false
  } finally {
    loading.value = false
  }
}

async function logout() {
  try {
    const rt = localStorage.getItem('cf_refresh')
    await api.post('/auth/logout', { refreshToken: rt }).catch(() => {})
  } finally {
    clearTokens()
    setUser(null)
  }
}

async function fetchMe() {
  try {
    const me = await api.get('/auth/me')
    setUser(me)
  } catch {
    clearTokens()
    setUser(null)
  }
}

async function changePassword(currentPassword, newPassword) {
  return api.post('/auth/change-password', { currentPassword, newPassword })
}

// Ouvir evento de logout forçado (token expirado)
window.addEventListener('cf:logout', () => {
  clearTokens()
  setUser(null)
})

export function useAuth() {
  return { user, isAuthenticated, isAdmin, loading, error, login, logout, fetchMe, changePassword }
}
