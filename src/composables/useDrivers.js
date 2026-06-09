import { ref, computed } from 'vue'
import { api } from './useApi'

const drivers = ref([])
const loading = ref(false)
const error = ref('')

export function useDrivers() {
  const sortedByTires = computed(() =>
    [...drivers.value].sort((a, b) => b.total_tires - a.total_tires)
  )

  async function fetchAll() {
    loading.value = true
    error.value = ''
    try {
      drivers.value = await api.get('/drivers')
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function fetchOne(id) {
    return api.get(`/drivers/${id}`)
  }

  async function create(data) {
    const res = await api.post('/drivers', data)
    await fetchAll()
    return res
  }

  async function update(id, data) {
    const res = await api.put(`/drivers/${id}`, data)
    await fetchAll()
    return res
  }

  async function remove(id) {
    const res = await api.delete(`/drivers/${id}`)
    await fetchAll()
    return res
  }

  return { drivers, sortedByTires, loading, error, fetchAll, fetchOne, create, update, remove }
}
