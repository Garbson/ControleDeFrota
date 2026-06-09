import { ref } from 'vue'
import { api } from './useApi'

const kpis = ref({
  activeDrivers: 0,
  stockTires: 0,
  totalTires: 0,
  cpTotal: 0,
  cpPendente: 0,
  crTotal: 0,
  crPendente: 0,
  fuelMonth: 0,
  fuelLiters: 0,
})
const topDrivers = ref([])
const recentMovements = ref([])
const loading = ref(false)

export function useDashboard() {
  async function fetchDashboard() {
    loading.value = true
    try {
      const data = await api.get('/dashboard')
      const k = data.kpis ?? {}
      kpis.value = {
        activeDrivers: k.activeDrivers ?? 0,
        stockTires: k.stockTires ?? 0,
        totalTires: k.totalTires ?? 0,
        cpTotal: Number(k.cpTotal ?? 0),
        cpPendente: Number(k.cpPendente ?? 0),
        crTotal: Number(k.crTotal ?? 0),
        crPendente: Number(k.crPendente ?? 0),
        fuelMonth: Number(k.fuelMonth ?? 0),
        fuelLiters: Number(k.fuelLiters ?? 0),
      }
      topDrivers.value = data.topDrivers ?? []
      recentMovements.value = data.recentMovements ?? []
    } finally {
      loading.value = false
    }
  }

  return { kpis, topDrivers, recentMovements, loading, fetchDashboard }
}
