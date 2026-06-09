import { ref } from 'vue'
import { api } from './useApi'

const items = ref([])
const summary = ref({ total: 0, pendente: 0, pago: 0, vencido: 0 })
const loading = ref(false)

export function usePayable() {
  async function fetchAll(filters = {}) {
    loading.value = true
    try {
      const params = new URLSearchParams()
      if (filters.status)   params.set('status', filters.status)
      if (filters.category) params.set('category', filters.category)
      if (filters.from)     params.set('from', filters.from)
      if (filters.to)       params.set('to', filters.to)
      const qs = params.toString()
      items.value = await api.get(`/payable${qs ? '?' + qs : ''}`)
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary() {
    summary.value = await api.get('/payable/summary')
  }

  async function create(data) {
    const res = await api.post('/payable', data)
    await fetchAll()
    await fetchSummary()
    return res
  }

  async function markPaid(id, paid_date) {
    const res = await api.patch(`/payable/${id}/pay`, { paid_date })
    const item = items.value.find(i => i.id === id)
    if (item) item.status = 'pago'
    await fetchSummary()
    return res
  }

  async function update(id, data) {
    const res = await api.put(`/payable/${id}`, data)
    await fetchAll()
    return res
  }

  async function remove(id) {
    const res = await api.delete(`/payable/${id}`)
    items.value = items.value.filter(i => i.id !== id)
    await fetchSummary()
    return res
  }

  return { items, summary, loading, fetchAll, fetchSummary, create, markPaid, update, remove }
}
