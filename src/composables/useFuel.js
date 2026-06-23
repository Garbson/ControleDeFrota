import { ref } from 'vue'
import { api } from './useApi'

const records = ref([])
const summary = ref({ total_records: 0, total_liters: 0, total_value: 0, avg_per_fill: 0, avg_price_liter: 0 })
const loading = ref(false)

export function useFuel() {
  async function fetchAll(filters = {}) {
    loading.value = true
    try {
      const params = new URLSearchParams()
      if (filters.driver_id) params.set('driver_id', filters.driver_id)
      if (filters.from)      params.set('from', filters.from)
      if (filters.to)        params.set('to', filters.to)
      const qs = params.toString()
      records.value = await api.get(`/fuel${qs ? '?' + qs : ''}`)
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary() {
    summary.value = await api.get('/fuel/summary')
  }

  async function create(data) {
    const res = await api.post('/fuel', data)
    await fetchAll()
    await fetchSummary()
    return res
  }

  async function update(id, data) {
    const res = await api.put(`/fuel/${id}`, data)
    await fetchAll()
    await fetchSummary()
    return res
  }

  async function remove(id) {
    const res = await api.delete(`/fuel/${id}`)
    records.value = records.value.filter(r => r.id !== id)
    await fetchSummary()
    return res
  }

  return { records, summary, loading, fetchAll, fetchSummary, create, update, remove }
}
