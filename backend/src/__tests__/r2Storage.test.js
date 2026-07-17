const {
  R2_PREFIX,
  isConfigured,
  isR2Reference,
  keyFromReference,
  createObjectKey,
  accessUrl,
} = require('../services/r2Storage')

describe('Armazenamento R2', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('permanece desativado sem credenciais, preservando arquivos locais', async () => {
    delete process.env.R2_ACCOUNT_ID
    delete process.env.R2_ACCESS_KEY_ID
    delete process.env.R2_SECRET_ACCESS_KEY
    delete process.env.R2_FILES_BUCKET
    expect(isConfigured()).toBe(false)
    expect(await accessUrl('/uploads/receipts/teste.webp')).toBe('/uploads/receipts/teste.webp')
  })

  it('identifica referências privadas e cria chaves sem reutilizar o nome enviado', () => {
    expect(isR2Reference(`${R2_PREFIX}payable/invoices/a.pdf`)).toBe(true)
    expect(keyFromReference(`${R2_PREFIX}payable/invoices/a.pdf`)).toBe('payable/invoices/a.pdf')
    const key = createObjectKey('payable/invoices', 'nota perigosa.PDF')
    expect(key).toMatch(/^payable\/invoices\/\d{4}\/\d{2}\/[a-f0-9-]+\.pdf$/)
    expect(key).not.toContain('nota perigosa')
  })
})
