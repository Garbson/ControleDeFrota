jest.mock('../services/r2Storage', () => ({ getClient: jest.fn() }))

const { pruneOldBackups } = require('../scripts/backup')

describe('Retenção de backups', () => {
  it('remove somente objetos anteriores ao período configurado', async () => {
    const oldDate = new Date(Date.now() - 40 * 86400000)
    const recentDate = new Date(Date.now() - 2 * 86400000)
    const s3 = {
      send: jest.fn()
        .mockResolvedValueOnce({
          Contents: [
            { Key: 'daily/antigo.sql.gz', LastModified: oldDate },
            { Key: 'daily/recente.sql.gz', LastModified: recentDate },
          ],
        })
        .mockResolvedValueOnce({}),
    }

    const removed = await pruneOldBackups(s3, 'controlefrota-backups', 35)

    expect(removed).toBe(1)
    expect(s3.send).toHaveBeenCalledTimes(2)
    expect(s3.send.mock.calls[1][0].input.Delete.Objects).toEqual([{ Key: 'daily/antigo.sql.gz' }])
  })
})
