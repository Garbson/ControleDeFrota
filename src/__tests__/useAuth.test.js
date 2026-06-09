import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock useApi com TODOS os exports necessários
vi.mock('../composables/useApi', () => {
  const clearTokens = vi.fn(() => {
    localStorage.removeItem('cf_token')
    localStorage.removeItem('cf_refresh')
  })
  const setTokens = vi.fn((at, rt) => {
    localStorage.setItem('cf_token', at)
    localStorage.setItem('cf_refresh', rt)
  })
  return {
    api: {
      post: vi.fn(),
      get: vi.fn(),
    },
    setTokens,
    clearTokens,
    getAccessToken: vi.fn(),
  }
})

import { api } from '../composables/useApi'

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.resetModules()
  })

  it('login retorna true e autentica o usuário ao receber tokens válidos', async () => {
    const { useAuth } = await import('../composables/useAuth')
    const { login, isAuthenticated } = useAuth()

    api.post.mockResolvedValueOnce({
      accessToken: 'access123',
      refreshToken: 'refresh456',
      user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' },
    })

    const result = await login('admin@test.com', 'Admin@2026')

    expect(result).toBe(true)
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@test.com',
      password: 'Admin@2026',
    })
  })

  it('login retorna false e não lança exceção em caso de credencial inválida', async () => {
    const { useAuth } = await import('../composables/useAuth')
    const { login } = useAuth()

    api.post.mockRejectedValueOnce(new Error('Credenciais inválidas'))

    const result = await login('x@x.com', 'wrong')

    expect(result).toBe(false)
  })

  it('logout chama endpoint e limpa tokens do localStorage', async () => {
    const { useAuth } = await import('../composables/useAuth')
    const { logout } = useAuth()

    localStorage.setItem('cf_token', 'tok')
    localStorage.setItem('cf_refresh', 'ref')

    api.post.mockResolvedValueOnce({ message: 'Logout realizado' })

    await logout()

    expect(api.post).toHaveBeenCalledWith('/auth/logout', expect.objectContaining({ refreshToken: 'ref' }))
    // clearTokens mock limpa o localStorage
    expect(localStorage.getItem('cf_token')).toBeNull()
    expect(localStorage.getItem('cf_refresh')).toBeNull()
  })

  it('isAdmin é true para usuário com role admin', async () => {
    const { useAuth } = await import('../composables/useAuth')
    const { login, isAdmin } = useAuth()

    api.post.mockResolvedValueOnce({
      accessToken: 'tok',
      refreshToken: 'ref',
      user: { id: 1, name: 'Admin', email: 'a@a.com', role: 'admin' },
    })

    await login('a@a.com', 'pass')

    expect(isAdmin.value).toBe(true)
  })
})
