import { expect, test } from '@playwright/test'

async function mockApi(page) {
  const state = {
    fines: [],
    lastFinePayload: null,
  }

  await page.route('**/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api', '')
    const method = request.method()
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

    if (path === '/auth/login' && method === 'POST') {
      return json({
        accessToken: 'e2e-access', refreshToken: 'e2e-refresh',
        user: { id: 1, name: 'Admin E2E', email: 'admin@e2e.test', role: 'admin' },
      })
    }
    if (path === '/auth/me') return json({ id: 1, name: 'Admin E2E', email: 'admin@e2e.test', role: 'admin' })
    if (path === '/dashboard') return json({ kpis: {}, topDrivers: [], recentMovements: [] })
    if (path === '/payable/summary') return json({ count_pendente: state.fines.filter(f => f.status === 'pendente').length })
    if (path === '/drivers') return json([])
    if (path === '/vehicles') return json([{ id: 10, plate: 'ABC1D23', type: 'truck', active: 1 }])
    if (path === '/fines/summary') {
      return json({
        total: state.fines.length,
        total_value: state.fines.reduce((sum, fine) => sum + Number(fine.value), 0),
        count_pendente: state.fines.filter(f => f.status === 'pendente').length,
        value_pendente: state.fines.filter(f => f.status === 'pendente').reduce((sum, fine) => sum + Number(fine.value), 0),
        count_pago: state.fines.filter(f => f.status === 'pago').length,
        value_pago: state.fines.filter(f => f.status === 'pago').reduce((sum, fine) => sum + Number(fine.value), 0),
        count_recurso: state.fines.filter(f => f.status === 'recurso').length,
      })
    }
    if (path === '/fines/descriptions') return json([])
    if (path === '/fines' && method === 'GET') return json(state.fines)
    if (path === '/fines' && method === 'POST') {
      state.lastFinePayload = request.postDataJSON()
      state.fines.push({ id: 77, ...state.lastFinePayload, status: 'pendente', driver_name: null })
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 77, message: 'Multa registrada e adicionada às contas a pagar' }) })
    }
    if (path === '/fines/77/pay' && method === 'PATCH') {
      state.fines[0].status = 'pago'
      return json({ message: 'Multa e conta a pagar marcadas como pagas' })
    }
    if (path.startsWith('/audit')) return json({ items: [], total: 0, page: 1, limit: 50 })

    return json([])
  })

  return state
}

async function login(page) {
  await page.goto('/')
  await page.getByLabel('E-mail').fill('admin@e2e.test')
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar no sistema' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear())
})

test('autentica e carrega módulos administrativos sob demanda', async ({ page }) => {
  await mockApi(page)
  await login(page)

  await page.getByRole('button', { name: 'Histórico de Auditoria' }).click()
  await expect(page.getByRole('heading', { name: 'Histórico de Auditoria' })).toBeVisible()
  await expect(page.getByText('Nenhuma alteração encontrada')).toBeVisible()
})

test('registra multa e exige confirmação antes de marcar o pagamento', async ({ page }) => {
  const state = await mockApi(page)
  await login(page)

  await page.getByRole('button', { name: 'Multas', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Multas' })).toBeVisible()
  await page.getByRole('button', { name: 'Lançar Multa' }).click()

  await page.getByLabel('Placa do Veículo *').selectOption('ABC1D23')
  await page.getByLabel('Valor (R$) *').fill('345.67')
  await page.getByLabel('Vencimento').fill('2026-08-10')
  await page.getByLabel('Descrição / Código da Multa').fill('Teste E2E - velocidade')
  await page.getByRole('button', { name: 'Registrar Multa' }).click()

  await expect(page.getByText('Teste E2E - velocidade')).toBeVisible()
  expect(state.lastFinePayload).toMatchObject({ vehicle_plate: 'ABC1D23', value: 345.67, due_date: '2026-08-10' })

  await page.getByRole('button', { name: 'Pagar', exact: true }).click()
  await expect(page.getByText('Marcar a multa de R$ 345,67 como paga?')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar pagamento' }).click()
  await expect(page.getByText('✓ Pago')).toBeVisible()
})
