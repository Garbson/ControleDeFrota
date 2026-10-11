import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }))

vi.mock('../composables/useApi', () => ({ api: { post: postMock } }))

vi.mock('../composables/useDrivers', async () => {
  const { ref } = await import('vue')
  return {
    useDrivers: () => ({
      drivers: ref([{ id: 7, name: 'SEBASTIAO', truck_plate: 'ABC1D23' }]),
      fetchAll: vi.fn(),
    }),
  }
})

vi.mock('../composables/useVehicles', async () => {
  const { ref } = await import('vue')
  return {
    useVehicles: () => ({
      vehicles: ref([{ id: 3, plate: 'ABC1D23', model: 'Volvo FH' }]),
      fetchAll: vi.fn(),
    }),
  }
})

vi.mock('../composables/useSuppliers', async () => {
  const { ref } = await import('vue')
  return {
    useSuppliers: () => ({
      suppliers: ref([]),
      fetchAll: vi.fn(),
      create: vi.fn(),
    }),
  }
})

vi.mock('../composables/usePayable', () => ({
  usePayable: () => ({ uploadInvoice: vi.fn() }),
}))

import ExpenseView from '../components/views/ExpenseView.vue'

const driverInput = (w) => w.find('input[placeholder*="Sem motorista"]')
const plateInput = (w) => w.find('input[placeholder*="Sem placa"]')
const saveButton = (w) =>
  w.findAll('button').find((b) => b.text().includes('Salvar Lançamento'))
const option = (w, text) => w.findAll('div').find((d) => d.text() === text)

async function fillRequiredFields(w) {
  await w.find('select').setValue('manutencao')
  await w.find('input[placeholder="0,00"]').setValue('150')
  await w.find('input[placeholder^="Ex: Troca"]').setValue('Troca de oleo')
  await w
    .find('input[placeholder^="Digite nome ou CNPJ"]')
    .setValue('Posto XYZ')
}

async function chooseNoDriver(w) {
  await driverInput(w).trigger('focus')
  await option(w, '— Sem motorista').trigger('mousedown')
}

async function chooseNoPlate(w) {
  await plateInput(w).trigger('focus')
  await option(w, '— Sem placa').trigger('mousedown')
}

describe('ExpenseView — motorista e placa obrigatórios', () => {
  let wrapper

  beforeEach(() => {
    postMock.mockReset()
    postMock.mockResolvedValue({ id: 1 })
    wrapper = mount(ExpenseView, { props: { showToast: vi.fn() } })
  })

  it('bloqueia o botão com motorista e placa vazios', async () => {
    await fillRequiredFields(wrapper)
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('bloqueia quando só o motorista foi resolvido', async () => {
    await fillRequiredFields(wrapper)
    await chooseNoDriver(wrapper)
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('libera com "Sem motorista" e "Sem placa" e grava tudo null', async () => {
    await fillRequiredFields(wrapper)
    await chooseNoDriver(wrapper)
    await chooseNoPlate(wrapper)
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()

    await saveButton(wrapper).trigger('click')
    await flushPromises()

    expect(postMock).toHaveBeenCalledWith(
      '/payable',
      expect.objectContaining({
        driver_id: null,
        driver_name_free: null,
        vehicle_id: null,
        vehicle_plate_free: null,
      }),
    )
  })

  it('grava texto livre quando motorista e placa não têm cadastro', async () => {
    await fillRequiredFields(wrapper)
    await driverInput(wrapper).setValue('ANTONIO')
    await plateInput(wrapper).setValue('ZZZ9999')
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()

    await saveButton(wrapper).trigger('click')
    await flushPromises()

    expect(postMock).toHaveBeenCalledWith(
      '/payable',
      expect.objectContaining({
        driver_id: null,
        driver_name_free: 'ANTONIO',
        vehicle_id: null,
        vehicle_plate_free: 'ZZZ9999',
      }),
    )
  })

  it('placa digitada igual a uma cadastrada vira o veículo, não texto livre', async () => {
    await fillRequiredFields(wrapper)
    await chooseNoDriver(wrapper)
    await plateInput(wrapper).setValue('abc-1d23')

    await saveButton(wrapper).trigger('click')
    await flushPromises()

    expect(postMock).toHaveBeenCalledWith(
      '/payable',
      expect.objectContaining({ vehicle_id: 3, vehicle_plate_free: null }),
    )
  })

  it('motorista cadastrado preenche a placa dele e não grava texto livre', async () => {
    await fillRequiredFields(wrapper)
    await driverInput(wrapper).trigger('focus')
    await option(wrapper, 'SEBASTIAO').trigger('mousedown')
    await flushPromises()

    expect(plateInput(wrapper).element.value).toBe('ABC1D23')
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()

    await saveButton(wrapper).trigger('click')
    await flushPromises()

    expect(postMock).toHaveBeenCalledWith(
      '/payable',
      expect.objectContaining({
        driver_id: 7,
        driver_name_free: null,
        vehicle_id: 3,
        vehicle_plate_free: null,
      }),
    )
  })

  it('digitar depois de "Sem motorista" desfaz a escolha', async () => {
    await fillRequiredFields(wrapper)
    await chooseNoDriver(wrapper)
    await chooseNoPlate(wrapper)
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()

    await driverInput(wrapper).setValue('A')
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
  })
})
