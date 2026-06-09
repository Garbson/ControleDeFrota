// Setup global para testes Vitest
import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock fetch global
global.fetch = vi.fn()

// Mock import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: { VITE_API_URL: '/api' },
  writable: true,
})
