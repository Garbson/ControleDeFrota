const { checksum, migrationNumber } = require('../config/migrate')

describe('Controle de migrations', () => {
  it('ordena versões pelo prefixo numérico', () => {
    expect(migrationNumber('017_audit.sql')).toBe(17)
    expect(migrationNumber('sem_prefixo.sql')).toBe(0)
  })

  it('gera checksum estável e detecta alteração', () => {
    expect(checksum('SELECT 1')).toBe(checksum('SELECT 1'))
    expect(checksum('SELECT 1')).not.toBe(checksum('SELECT 2'))
  })
})
