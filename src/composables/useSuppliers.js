import { ref } from 'vue'
import { api } from './useApi'

const suppliers = ref([])
const loading = ref(false)

export function useSuppliers() {
  async function fetchAll() {
    loading.value = true
    try {
      suppliers.value = await api.get('/suppliers')
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    const res = await api.post('/suppliers', data)
    await fetchAll()
    return res
  }

  async function update(id, data) {
    const res = await api.put(`/suppliers/${id}`, data)
    await fetchAll()
    return res
  }

  async function remove(id) {
    const res = await api.delete(`/suppliers/${id}`)
    await fetchAll()
    return res
  }

  return { suppliers, loading, fetchAll, create, update, remove }
}
