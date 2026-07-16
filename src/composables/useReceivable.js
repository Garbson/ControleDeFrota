import { ref } from 'vue'
import { api } from './useApi'
import { optimizeUploadImage } from '../utils/imageUpload'

const items = ref([])
const summary = ref({ total: 0, pendente: 0, recebido: 0 })
const loading = ref(false)

export function useReceivable() {
  async function fetchAll(filters = {}) {
    loading.value = true
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      const qs = params.toString()
      items.value = await api.get(`/receivable${qs ? '?' + qs : ''}`)
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary() {
    summary.value = await api.get('/receivable/summary')
  }

  async function create(data) {
    const res = await api.post('/receivable', data)
    await fetchAll()
    await fetchSummary()
    return res
  }

  async function markReceived(id, received_date) {
    const res = await api.patch(`/receivable/${id}/receive`, { received_date })
    const item = items.value.find(i => i.id === id)
    if (item) item.status = 'recebido'
    await fetchSummary()
    return res
  }

  async function update(id, data) {
    const res = await api.put(`/receivable/${id}`, data)
    await fetchAll()
    await fetchSummary()
    return res
  }

  async function remove(id) {
    const res = await api.delete(`/receivable/${id}`)
    items.value = items.value.filter(i => i.id !== id)
    await fetchSummary()
    return res
  }

  async function uploadReceipt(id, file) {
    const optimizedFile = await optimizeUploadImage(file)
    const formData = new FormData()
    formData.append('receipt', optimizedFile)
    const data = await api.upload(`/receivable/${id}/receipt`, formData)
    const item = items.value.find(i => i.id === id)
    if (item) item.receipt_url = data.receipt_url
    return data
  }

  async function deleteReceipt(id) {
    const res = await api.delete(`/receivable/${id}/receipt`)
    const item = items.value.find(i => i.id === id)
    if (item) item.receipt_url = null
    return res
  }

  return { items, summary, loading, fetchAll, fetchSummary, create, update, markReceived, remove, uploadReceipt, deleteReceipt }
}
