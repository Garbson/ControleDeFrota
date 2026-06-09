const request = require('supertest')
const app = require('../app')

// Mock do banco de dados
jest.mock('../config/database', () => ({
  query: jest.fn(),
  testConnection: jest.fn(),
}))

const { query } = require('../config/database')
const bcrypt = require('bcryptjs')

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('deve retornar 400 com e-mail inválido', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nao-é-email', password: '123456' })
      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it('deve retornar 401 quando usuário não existe', async () => {
      query.mockResolvedValueOnce([]) // usuário não encontrado
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nao@existe.com', password: 'senha123' })
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Credenciais inválidas')
    })

    it('deve retornar 401 com senha incorreta', async () => {
      const hash = await bcrypt.hash('senhaCorreta', 12)
      query.mockResolvedValueOnce([{ id: 1, email: 'test@test.com', name: 'Test', password: hash, role: 'admin', active: 1 }])
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'senhaErrada' })
      expect(res.status).toBe(401)
    })

    it('deve fazer login com sucesso e retornar tokens', async () => {
      const hash = await bcrypt.hash('senha123', 12)
      query
        .mockResolvedValueOnce([{ id: 1, email: 'admin@test.com', name: 'Admin', password: hash, role: 'admin', active: 1 }])
        .mockResolvedValueOnce({ insertId: 1 }) // insert refresh token

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'senha123' })

      expect(res.status).toBe(200)
      expect(res.body.accessToken).toBeDefined()
      expect(res.body.refreshToken).toBeDefined()
      expect(res.body.user.email).toBe('admin@test.com')
      expect(res.body.user.password).toBeUndefined() // nunca retornar senha
    })
  })

  describe('GET /api/auth/me', () => {
    it('deve retornar 401 sem token', async () => {
      const res = await request(app).get('/api/auth/me')
      expect(res.status).toBe(401)
    })

    it('deve retornar 401 com token inválido', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token-invalido')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /health', () => {
    it('deve retornar status ok', async () => {
      const res = await request(app).get('/health')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
    })
  })
})
