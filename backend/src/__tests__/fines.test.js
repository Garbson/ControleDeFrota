const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('../config/database', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
  testConnection: jest.fn(),
}))

const { transaction } = require('../config/database')
const app = require('../app')

function token() {
  return jwt.sign(
    { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
    process.env.JWT_SECRET
  )
}

beforeAll(() => {
  process.env.JWT_SECRET = 'test_secret_key_for_tests_only'
})

beforeEach(() => jest.clearAllMocks())

describe('Integração entre multas e contas a pagar', () => {
  it('cria multa e conta a pagar na mesma transação', async () => {
    const tx = jest.fn()
      .mockResolvedValueOnce({ insertId: 77 }) // INSERT fine
      .mockResolvedValueOnce([{ id: 10 }]) // veículo pela placa
      .mockResolvedValueOnce({ insertId: 88 }) // INSERT payable
      .mockResolvedValueOnce({ affectedRows: 1 }) // vincula payable à fine
    transaction.mockImplementation(callback => callback(tx))

    const res = await request(app)
      .post('/api/fines')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        vehicle_plate: 'abc1d23', value: 345.67,
        fine_date: '2026-07-16', due_date: '2026-08-10',
        description: 'Excesso de velocidade', category: 'velocidade',
      })

    expect(res.status).toBe(201)
    expect(res.body.id).toBe(77)
    expect(res.body.message).toContain('contas a pagar')
    expect(tx.mock.calls[2][0]).toContain('INSERT INTO accounts_payable')
    expect(tx.mock.calls[2][0]).toContain("'multas'")
    expect(tx.mock.calls[3][1]).toEqual([88, 77])
  })

  it('marca multa e conta vinculada como pagas juntas', async () => {
    const tx = jest.fn()
      .mockResolvedValueOnce([{ id: 77, account_payable_id: 88, status: 'pendente' }])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 })
    transaction.mockImplementation(callback => callback(tx))

    const res = await request(app)
      .patch('/api/fines/77/pay')
      .set('Authorization', `Bearer ${token()}`)
      .send({ paid_date: '2026-07-16' })

    expect(res.status).toBe(200)
    expect(res.body.message).toContain('conta a pagar')
    expect(tx.mock.calls[2][0]).toContain("accounts_payable SET status = 'pago'")
    expect(tx.mock.calls[2][1]).toEqual(['2026-07-16', 88])
  })
})
