import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../composables/useApi', () => ({
  api: { get: vi.fn() },
}))

import { api } from '../composables/useApi'

const mockDashboardResponse = {
  kpis: {
    activeDrivers: 13,
    stockTires: 55,
    totalTires: 139,
    cpTotal: '15268.79',
    cpPendente: '11318.79',
    crTotal: '42800.00',
    crPendente: '28300.00',
    fuelMonth: '16413.00',
    fuelLiters: '2850.00',
  },
  topDrivers: [
    { name: 'MATHEUS', color: '#f59e0b', tires: 24 },
    { name: 'DANIEL',  color: '#059669', tires: 19 },
    { name: 'BEBE',    color: '#7c3aed', tires: 17 },
  ],
  recentMovements: [
    { id: 1, type: 'saida', qty: 4, driver_name: 'MATHEUS', item_name: 'Supercargo Liso', mov_date: '2026-05-24' },
  ],
  pendingActions: { overduePayables: 4, overdueValue: 9800, dueSoonPayables: 3, missingInvoices: 8, pendingFines: 2, pendingFinesValue: 750 },
}

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('fetchDashboard popula kpis, topDrivers e recentMovements', async () => {
    const { useDashboard } = await import('../composables/useDashboard')
    const { kpis, topDrivers, recentMovements, pendingActions, fetchDashboard } = useDashboard()

    api.get.mockResolvedValueOnce(mockDashboardResponse)

    await fetchDashboard()

    expect(api.get).toHaveBeenCalledWith('/dashboard')
    expect(kpis.value.activeDrivers).toBe(13)
    expect(kpis.value.stockTires).toBe(55)
    expect(kpis.value.cpPendente).toBe(11318.79)
    expect(topDrivers.value).toHaveLength(3)
    expect(topDrivers.value[0].name).toBe('MATHEUS')
    expect(recentMovements.value).toHaveLength(1)
    expect(pendingActions.value.overduePayables).toBe(4)
    expect(pendingActions.value.missingInvoices).toBe(8)
  })

  it('lida com resposta vazia sem erros', async () => {
    const { useDashboard } = await import('../composables/useDashboard')
    const { kpis, topDrivers, fetchDashboard } = useDashboard()

    api.get.mockResolvedValueOnce({ kpis: {}, topDrivers: [], recentMovements: [] })

    await fetchDashboard()

    expect(kpis.value.activeDrivers).toBe(0)
    expect(topDrivers.value).toHaveLength(0)
  })
})
