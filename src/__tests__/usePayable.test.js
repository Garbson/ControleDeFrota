import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../composables/useApi', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '../composables/useApi'

describe('usePayable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('fetchAll popula items com dados da API', async () => {
    const { usePayable } = await import('../composables/usePayable')
    const { items, fetchAll } = usePayable()

    const mockData = [
      { id: 1, value: 1000, due_date: '2026-06-01', status: 'pendente', category: 'manutencao' },
      { id: 2, value: 500,  due_date: '2026-06-15', status: 'pago',     category: 'pecas' },
    ]
    api.get.mockResolvedValueOnce(mockData)

    await fetchAll()

    expect(api.get).toHaveBeenCalledWith('/payable')
    expect(items.value).toHaveLength(2)
    expect(items.value[0].id).toBe(1)
  })

  it('markPaid chama endpoint correto e atualiza status local', async () => {
    const { usePayable } = await import('../composables/usePayable')
    const { items, markPaid } = usePayable()

    // Pre-popula
    items.value = [{ id: 1, value: 1000, status: 'pendente' }]

    api.patch.mockResolvedValueOnce({ message: 'Conta marcada como paga' })
    api.get.mockResolvedValueOnce({ total: 1000, pendente: 0, pago: 1000 })

    await markPaid(1, '2026-06-01')

    expect(api.patch).toHaveBeenCalledWith('/payable/1/pay', { paid_date: '2026-06-01' })
    expect(items.value[0].status).toBe('pago')
  })

  it('create chama POST e refaz a lista', async () => {
    const { usePayable } = await import('../composables/usePayable')
    const { create } = usePayable()

    api.post.mockResolvedValueOnce({ id: 10, message: 'Conta criada' })
    api.get.mockResolvedValue([])

    const result = await create({ value: 500, due_date: '2026-07-01', category: 'administrativo' })

    expect(api.post).toHaveBeenCalledWith('/payable', expect.objectContaining({ value: 500 }))
    expect(result.id).toBe(10)
  })
})
