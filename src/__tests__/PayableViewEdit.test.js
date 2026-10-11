import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'

const { updateMock } = vi.hoisted(() => ({ updateMock: vi.fn() }))

vi.mock('../composables/usePayable', async () => {
  const { ref } = await import('vue')
  return {
    usePayable: () => ({
      items: ref([]),
      summary: ref({ total: 0, pendente: 0, pago: 0, vencido: 0, count_total: 0, count_pendente: 0 }),
      loading: ref(false),
      fetchAll: vi.fn(),
      fetchSummary: vi.fn(),
      markPaid: vi.fn(),
      update: updateMock,
      remove: vi.fn(),
      uploadReceipt: vi.fn(),
      deleteReceipt: vi.fn(),
      uploadInvoice: vi.fn(),
      deleteInvoice: vi.fn(),
    }),
  }
})

vi.mock('../composables/useDrivers', async () => {
  const { ref } = await import('vue')
  return {
    useDrivers: () => ({
      drivers: ref([{ id: 7, name: 'SEBASTIAO' }]),
      fetchAll: vi.fn(),
    }),
  }
})

vi.mock('../composables/useVehicles', async () => {
  const { ref } = await import('vue')
  return {
    useVehicles: () => ({
      vehicles: ref([{ id: 3, plate: 'ABC1D23', brand: 'Volvo', model: 'FH' }]),
      fetchAll: vi.fn(),
    }),
  }
})

vi.mock('../composables/useSuppliers', async () => {
  const { ref } = await import('vue')
  return { useSuppliers: () => ({ suppliers: ref([]), fetchAll: vi.fn() }) }
})

vi.mock('../composables/useConfirm', () => ({
  useConfirm: () => ({ confirmAction: vi.fn() }),
}))

vi.mock('../utils/printTable', () => ({ printTable: vi.fn() }))
vi.mock('../utils/exportTable', () => ({
  exportExcelGeneric: vi.fn(),
  exportWordGeneric: vi.fn(),
}))

import PayableView from '../components/views/PayableView.vue'

// O modal usa <Teleport to="body">, então buscamos direto no document.body
const el = (selector) => {
  const node = document.body.querySelector(selector)
  return node ? new DOMWrapper(node) : null
}
const byText = (selector, text) => {
  const node = [...document.body.querySelectorAll(selector)].find(
    (n) => n.textContent.trim() === text,
  )
  return node ? new DOMWrapper(node) : null
}
const driverInput = () => el('input[placeholder*="Sem motorista"]')
const plateInput = () => el('input[placeholder*="Sem placa"]')
const descriptionInput = () => el('input[type="text"]:not([placeholder])')
const saveButton = () => byText('button', 'Salvar Alterações')
const errorText = () => el('p.text-red-500')?.text()

const baseRow = {
  id: 10,
  value: 100,
  due_date: '2026-07-01T00:00:00.000Z',
  issue_date: null,
  document: null,
  description: 'Troca de óleo',
  category: 'manutencao',
  obs: null,
  status: 'pendente',
  supplier_id: null,
  supplier_name: null,
  supplier_name_free: 'Posto XYZ',
  trip_id: null,
}

describe('PayableView — editar conta (motorista e placa)', () => {
  let wrapper

  async function openEdit(row) {
    wrapper.vm.openEditPayable({ ...baseRow, ...row })
    await flushPromises()
  }

  beforeEach(() => {
    updateMock.mockReset()
    updateMock.mockResolvedValue({})
    wrapper = mount(PayableView, {
      props: { showToast: vi.fn() },
      attachTo: document.body,
    })
  })

  afterEach(() => {
    wrapper.unmount()
  })

  it('preserva motorista e placa livres ao editar outro campo (não apaga)', async () => {
    await openEdit({
      driver_id: null,
      driver_name: 'ANTONIO',
      driver_name_free: 'ANTONIO',
      vehicle_id: null,
      vehicle_plate: 'ZZZ9999',
      vehicle_plate_free: 'ZZZ9999',
    })
    expect(driverInput().element.value).toBe('ANTONIO')
    expect(plateInput().element.value).toBe('ZZZ9999')

    await saveButton().trigger('click')
    await flushPromises()

    expect(updateMock).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        driver_id: null,
        driver_name_free: 'ANTONIO',
        vehicle_id: null,
        vehicle_plate_free: 'ZZZ9999',
      }),
    )
  })

  it('conta antiga sem motorista/placa abre como "Sem ..." e salva null', async () => {
    await openEdit({
      driver_id: null,
      driver_name: 'Sem motorista',
      driver_name_free: null,
      vehicle_id: null,
      vehicle_plate: 'Sem placa',
      vehicle_plate_free: null,
    })
    expect(driverInput().element.value).toBe('Sem motorista')
    expect(plateInput().element.value).toBe('Sem placa')

    await saveButton().trigger('click')
    await flushPromises()

    expect(updateMock).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        driver_id: null,
        driver_name_free: null,
        vehicle_id: null,
        vehicle_plate_free: null,
      }),
    )
  })

  it('motorista cadastrado manda o id e descarta texto livre', async () => {
    await openEdit({
      driver_id: 7,
      driver_name: 'SEBASTIAO',
      driver_name_free: null,
      vehicle_id: 3,
      vehicle_plate: 'ABC1D23',
      vehicle_plate_free: null,
    })

    await saveButton().trigger('click')
    await flushPromises()

    expect(updateMock).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        driver_id: 7,
        driver_name_free: null,
        vehicle_id: 3,
        vehicle_plate_free: null,
      }),
    )
  })

  it('placa digitada igual a uma cadastrada vira o veículo, não texto livre', async () => {
    await openEdit({
      driver_id: 7,
      driver_name: 'SEBASTIAO',
      vehicle_id: null,
      vehicle_plate: 'ZZZ9999',
      vehicle_plate_free: 'ZZZ9999',
    })
    await plateInput().setValue('abc1d23')

    await saveButton().trigger('click')
    await flushPromises()

    expect(updateMock).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ vehicle_id: 3, vehicle_plate_free: null }),
    )
  })

  it('placa sem cadastro continua como texto livre em maiúsculas', async () => {
    await openEdit({
      driver_id: 7,
      driver_name: 'SEBASTIAO',
      vehicle_id: 3,
      vehicle_plate: 'ABC1D23',
    })
    await plateInput().setValue('xyz9a88')

    await saveButton().trigger('click')
    await flushPromises()

    expect(updateMock).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ vehicle_id: null, vehicle_plate_free: 'XYZ9A88' }),
    )
  })

  it('bloqueia salvar com motorista vazio', async () => {
    await openEdit({
      driver_id: 7,
      driver_name: 'SEBASTIAO',
      vehicle_id: 3,
      vehicle_plate: 'ABC1D23',
    })
    await driverInput().setValue('')

    await saveButton().trigger('click')
    await flushPromises()

    expect(updateMock).not.toHaveBeenCalled()
    expect(errorText()).toContain('motorista')
  })

  it('bloqueia salvar com placa vazia', async () => {
    await openEdit({
      driver_id: 7,
      driver_name: 'SEBASTIAO',
      vehicle_id: 3,
      vehicle_plate: 'ABC1D23',
    })
    await plateInput().setValue('')

    await saveButton().trigger('click')
    await flushPromises()

    expect(updateMock).not.toHaveBeenCalled()
    expect(errorText()).toContain('placa')
  })

  it('bloqueia salvar com descrição vazia', async () => {
    await openEdit({
      driver_id: 7,
      driver_name: 'SEBASTIAO',
      vehicle_id: 3,
      vehicle_plate: 'ABC1D23',
      description: '   ',
    })

    await saveButton().trigger('click')
    await flushPromises()

    expect(updateMock).not.toHaveBeenCalled()
    expect(errorText()).toContain('Descrição')
  })

  it('escolher "Sem motorista" na lista libera o salvamento', async () => {
    await openEdit({
      driver_id: 7,
      driver_name: 'SEBASTIAO',
      vehicle_id: 3,
      vehicle_plate: 'ABC1D23',
    })
    await driverInput().trigger('focus')
    await byText('li', '— Sem motorista').trigger('mousedown')

    await saveButton().trigger('click')
    await flushPromises()

    expect(updateMock).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ driver_id: null, driver_name_free: null }),
    )
  })
})
