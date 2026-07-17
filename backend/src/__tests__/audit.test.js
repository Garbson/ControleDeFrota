jest.mock('../config/database', () => ({ query: jest.fn() }))

const { actionFromRequest, resourceFromRequest, sanitize } = require('../middleware/audit')

describe('Auditoria', () => {
  it('remove credenciais dos dados registrados', () => {
    expect(sanitize({ name: 'Ana', password: 'segredo', nested: { refreshToken: 'token' } })).toEqual({
      name: 'Ana', password: '[PROTEGIDO]', nested: { refreshToken: '[PROTEGIDO]' },
    })
  })

  it('identifica entidade, registro e ação pela requisição', () => {
    const req = { baseUrl: '/api/fines', path: '/77/pay', method: 'PATCH' }
    expect(resourceFromRequest(req)).toMatchObject({ entity: 'fines', entityId: '77', table: 'fines' })
    expect(actionFromRequest(req)).toBe('alterou_pay')
  })
})
