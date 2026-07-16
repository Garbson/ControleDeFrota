import { describe, it, expect } from 'vitest'
import { useConfirm } from '../composables/useConfirm'

describe('useConfirm', () => {
  it('resolve true ao confirmar uma ação', async () => {
    const { confirmState, confirmAction, confirm } = useConfirm()
    const pending = confirmAction({ title: 'Excluir', message: 'Tem certeza?' })

    expect(confirmState.value.title).toBe('Excluir')
    confirm()

    await expect(pending).resolves.toBe(true)
    expect(confirmState.value).toBeNull()
  })

  it('resolve false ao cancelar uma ação', async () => {
    const { confirmAction, cancel } = useConfirm()
    const pending = confirmAction()
    cancel()
    await expect(pending).resolves.toBe(false)
  })
})
