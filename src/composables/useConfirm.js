import { ref } from 'vue'

const state = ref(null)
let resolver = null

function confirmAction(options = {}) {
  if (resolver) resolver(false)

  state.value = {
    title: options.title || 'Confirmar ação',
    message: options.message || 'Tem certeza que deseja continuar?',
    confirmText: options.confirmText || 'Confirmar',
    cancelText: options.cancelText || 'Cancelar',
    tone: options.tone || 'danger',
  }

  return new Promise(resolve => {
    resolver = resolve
  })
}

function settle(result) {
  const currentResolver = resolver
  resolver = null
  state.value = null
  currentResolver?.(result)
}

export function useConfirm() {
  return {
    confirmState: state,
    confirmAction,
    confirm: () => settle(true),
    cancel: () => settle(false),
  }
}
