import { ref } from 'vue'
import { api } from './useApi'

const users = ref([])
const loading = ref(false)

export function useUsers() {
  async function fetchAll() {
    loading.value = true
    try {
      users.value = await api.get('/users')
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    const res = await api.post('/users', data)
    await fetchAll()
    return res
  }

  async function update(id, data) {
    const res = await api.put(`/users/${id}`, data)
    await fetchAll()
    return res
  }

  async function resetPassword(id, password) {
    return api.patch(`/users/${id}/password`, { password })
  }

  async function toggle(id) {
    const res = await api.patch(`/users/${id}/toggle`, {})
    await fetchAll()
    return res
  }

  return { users, loading, fetchAll, create, update, resetPassword, toggle }
}
