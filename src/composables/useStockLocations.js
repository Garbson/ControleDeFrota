import { ref } from 'vue'
import { api } from './useApi'

const locations = ref([])
const loading = ref(false)

export function useStockLocations() {
  async function fetchAll() {
    loading.value = true
    try {
      locations.value = await api.get('/stock/locations')
    } finally {
      loading.value = false
    }
  }

  async function create(name) {
    const res = await api.post('/stock/locations', { name })
    await fetchAll()
    return res
  }

  async function remove(id) {
    const res = await api.delete(`/stock/locations/${id}`)
    await fetchAll()
    return res
  }

  return { locations, loading, fetchAll, create, remove }
}
