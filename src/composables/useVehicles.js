import { ref, computed } from 'vue'
import { api } from './useApi'

const vehicles = ref([])
const loading = ref(false)

export function useVehicles() {
  const trucks = computed(() => vehicles.value.filter(v => v.type === 'truck'))
  const trailers = computed(() => vehicles.value.filter(v => v.type === 'trailer'))

  async function fetchAll(type = null) {
    loading.value = true
    try {
      const qs = type ? `?type=${type}` : ''
      vehicles.value = await api.get(`/vehicles${qs}`)
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    const res = await api.post('/vehicles', data)
    await fetchAll()
    return res
  }

  async function update(id, data) {
    const res = await api.put(`/vehicles/${id}`, data)
    await fetchAll()
    return res
  }

  return { vehicles, trucks, trailers, loading, fetchAll, create, update }
}
