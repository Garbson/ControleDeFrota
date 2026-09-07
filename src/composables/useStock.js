import { ref } from 'vue'
import { optimizeUploadImage } from '../utils/imageUpload'
import { api } from './useApi'

const items = ref([])
const movements = ref([])
const loading = ref(false)
const currentItemType = ref(null)
const currentLocationId = ref(null)

export function useStock() {
  async function fetchAll(filters = {}) {
    loading.value = true
    if (filters.item_type !== undefined) currentItemType.value = filters.item_type
    if (filters.stock_location_id !== undefined) currentLocationId.value = filters.stock_location_id
    try {
      const params = new URLSearchParams()
      const type = filters.item_type || currentItemType.value
      const loc = filters.stock_location_id ?? currentLocationId.value
      if (type) params.set('item_type', type)
      if (loc) params.set('stock_location_id', loc)
      const qs = params.toString()
      items.value = await api.get(`/stock${qs ? '?' + qs : ''}`)
    } finally {
      loading.value = false
    }
  }

  async function fetchMovements() {
    const params = new URLSearchParams()
    if (currentItemType.value) params.set('item_type', currentItemType.value)
    if (currentLocationId.value) params.set('stock_location_id', currentLocationId.value)
    const qs = params.toString()
    movements.value = await api.get(`/stock/movements${qs ? '?' + qs : ''}`)
  }

  async function create(data) {
    const res = await api.post('/stock', data)
    await fetchAll()
    return res
  }

  async function update(id, data) {
    const res = await api.put(`/stock/${id}`, data)
    await fetchAll()
    return res
  }

  async function remove(id) {
    const res = await api.delete(`/stock/${id}`)
    items.value = items.value.filter(i => i.id !== id)
    movements.value = movements.value.filter(m => m.stock_item_id !== id)
    return res
  }

  async function createMovement(data) {
    const res = await api.post('/stock/movements', data)
    await fetchAll()
    await fetchMovements()
    return res
  }

  async function removeMovement(id) {
    const res = await api.delete(`/stock/movements/${id}`)
    await fetchAll()
    await fetchMovements()
    return res
  }

  async function uploadInvoice(id, file) {
    const optimizedFile = await optimizeUploadImage(file)
    const formData = new FormData()
    formData.append('invoice', optimizedFile)
    const data = await api.upload(`/stock/${id}/invoice`, formData)
    const item = items.value.find(i => i.id === id)
    if (item) {
      item.invoice_url = data.invoice_url
      item.invoice_access_url = data.invoice_access_url
    }
    return data
  }

  async function deleteInvoice(id) {
    const res = await api.delete(`/stock/${id}/invoice`)
    const item = items.value.find(i => i.id === id)
    if (item) {
      item.invoice_url = null
      item.invoice_access_url = null
    }
    return res
  }

  return { items, movements, loading, fetchAll, fetchMovements, create, update, remove, createMovement, removeMovement, uploadInvoice, deleteInvoice }
}
