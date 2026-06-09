import { ref } from 'vue'
import { api } from './useApi'

const items = ref([])
const summary = ref({ total: 0, total_value: 0, count_pendente: 0, value_pendente: 0, count_pago: 0, value_pago: 0, count_recurso: 0 })
const loading = ref(false)

export function useFines() {
  async function fetchAll(filters = {}) {
    loading.value = true
    try {
      const params = new URLSearchParams()
      if (filters.status)    params.set('status', filters.status)
      if (filters.driver_id) params.set('driver_id', filters.driver_id)
      const qs = params.toString()
      items.value = await api.get(`/fines${qs ? '?' + qs : ''}`)
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary() {
    summary.value = await api.get('/fines/summary')
  }

  async function create(data) {
    const res = await api.post('/fines', data)
    await fetchAll()
    await fetchSummary()
    return res
  }

  async function markPaid(id, paid_date) {
    await api.patch(`/fines/${id}/pay`, { paid_date })
    const item = items.value.find(f => f.id === id)
    if (item) item.status = 'pago'
    await fetchSummary()
  }

  async function markAppeal(id) {
    await api.patch(`/fines/${id}/appeal`, {})
    const item = items.value.find(f => f.id === id)
    if (item) item.status = 'recurso'
    await fetchSummary()
  }

  async function remove(id) {
    await api.delete(`/fines/${id}`)
    items.value = items.value.filter(f => f.id !== id)
    await fetchSummary()
  }

  return { items, summary, loading, fetchAll, fetchSummary, create, markPaid, markAppeal, remove }
}
