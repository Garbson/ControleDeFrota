const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../app')

jest.mock('../config/database', () => ({
  query: jest.fn(),
  testConnection: jest.fn(),
}))

const { query } = require('../config/database')

// Gerar token válido para os testes
function makeToken(role = 'admin') {
  return jwt.sign(
    { id: 1, email: 'admin@test.com', name: 'Admin', role },
    process.env.JWT_SECRET || 'test_secret_key_for_tests_only'
  )
}

// Configurar JWT_SECRET nos testes
beforeAll(() => {
  process.env.JWT_SECRET = 'test_secret_key_for_tests_only'
})

describe('Payable Routes', () => {
  let token

  beforeEach(() => {
    jest.clearAllMocks()
    token = makeToken('admin')
  })

  describe('GET /api/payable', () => {
    it('deve retornar 401 sem autenticação', async () => {
      const res = await request(app).get('/api/payable')
      expect(res.status).toBe(401)
    })

    it('deve retornar lista de contas com token válido', async () => {
      const mockItems = [
        { id: 1, document: 'NF 001', value: 1000.00, status: 'pendente', category: 'manutencao', due_date: '2026-06-01' },
        { id: 2, document: 'NF 002', value: 500.00, status: 'pago', category: 'pneus', due_date: '2026-06-15' },
      ]
      query.mockResolvedValueOnce(mockItems)

      const res = await request(app)
        .get('/api/payable')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
      expect(res.body[0].value).toBe(1000.00)
    })
  })

  describe('POST /api/payable', () => {
    it('deve retornar 400 com dados inválidos', async () => {
      const res = await request(app)
        .post('/api/payable')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: -100, category: 'manutencao' }) // valor negativo + sem due_date
      expect(res.status).toBe(400)
    })

    it('deve criar conta com dados válidos', async () => {
      query.mockResolvedValueOnce({ insertId: 99 })
      const res = await request(app)
        .post('/api/payable')
        .set('Authorization', `Bearer ${token}`)
        .send({
          document: 'NF 999',
          category: 'manutencao',
          value: 1500.00,
          due_date: '2026-07-01',
        })
      expect(res.status).toBe(201)
      expect(res.body.id).toBe(99)
    })
  })

  describe('PATCH /api/payable/:id/pay', () => {
    it('deve marcar conta como paga', async () => {
      query
        .mockResolvedValueOnce({ affectedRows: 1 })
        .mockResolvedValueOnce({ affectedRows: 1 })
      const res = await request(app)
        .patch('/api/payable/1/pay')
        .set('Authorization', `Bearer ${token}`)
        .send({ paid_date: '2026-06-09' })
      expect(res.status).toBe(200)
      expect(res.body.message).toContain('paga')
      expect(query.mock.calls[1][0]).toContain("fines SET status = 'pago'")
    })
  })

  describe('DELETE /api/payable/:id', () => {
    it('impede excluir isoladamente uma conta vinculada a multa', async () => {
      query.mockResolvedValueOnce([{ id: 77 }])
      const res = await request(app)
        .delete('/api/payable/88')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(409)
      expect(res.body.error).toContain('tela de Multas')
    })
  })
})
