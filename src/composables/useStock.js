import { ref } from 'vue'
import { api } from './useApi'

const items = ref([])
const movements = ref([])
const loading = ref(false)

export function useStock() {
  async function fetchAll() {
    loading.value = true
    try {
      items.value = await api.get('/stock')
    } finally {
      loading.value = false
    }
  }

  async function fetchMovements() {
    movements.value = await api.get('/stock/movements')
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

  return { items, movements, loading, fetchAll, fetchMovements, create, update, remove, createMovement, removeMovement }
}
