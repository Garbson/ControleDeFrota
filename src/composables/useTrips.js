import { ref } from 'vue'
import { api } from './useApi'

const items = ref([])
const summary = ref({})
const loading = ref(false)

export function useTrips() {
  async function fetchAll(filters = {}) {
    loading.value = true
    try {
      const params = new URLSearchParams()
      if (filters.driver_id) params.set('driver_id', filters.driver_id)
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      const qs = params.toString()
      items.value = await api.get(`/trips${qs ? '?' + qs : ''}`)
    } finally {
      loading.value = false
    }
  }

  async function fetchOne(id) {
    return api.get(`/trips/${id}`)
  }

  async function fetchSummary() {
    summary.value = await api.get('/trips/summary')
  }

  async function create(data) {
    const res = await api.post('/trips', data)
    await fetchAll()
    await fetchSummary()
    return res
  }

  async function update(id, data) {
    const res = await api.put(`/trips/${id}`, data)
    return res
  }

  async function remove(id) {
    await api.delete(`/trips/${id}`)
    items.value = items.value.filter(t => t.id !== id)
    await fetchSummary()
  }

  return { items, summary, loading, fetchAll, fetchOne, fetchSummary, create, update, remove }
}
