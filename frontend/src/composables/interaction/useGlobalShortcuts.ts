import { onMounted, onUnmounted } from 'vue'

export type GlobalShortcutHandlers = {
  togglePalette: () => void
  openQuickOpen: () => void
  navigateSftpBack: () => void
  navigateSftpForward: () => void
  closeQuickOpen: () => boolean
  closePalette: () => boolean
  closeWindowMenu: () => boolean
  closeContextMenu: () => boolean
  closeConfirmDialog: () => boolean
  isSftpActive: () => boolean
}

export function useGlobalShortcuts(handlers: GlobalShortcutHandlers) {
  function handleGlobalKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault()
      handlers.togglePalette()
      return
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'p' && handlers.isSftpActive()) {
      event.preventDefault()
      handlers.openQuickOpen()
      return
    }

    if (event.altKey && event.key === 'ArrowLeft' && handlers.isSftpActive()) {
      event.preventDefault()
      handlers.navigateSftpBack()
      return
    }

    if (event.altKey && event.key === 'ArrowRight' && handlers.isSftpActive()) {
      event.preventDefault()
      handlers.navigateSftpForward()
      return
    }

    if (event.key === 'Escape') {
      if (handlers.closeQuickOpen()) return
      if (handlers.closePalette()) return
      if (handlers.closeWindowMenu()) return
      if (handlers.closeContextMenu()) return
      handlers.closeConfirmDialog()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleGlobalKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleGlobalKeydown)
  })

  return {
    handleGlobalKeydown,
  }
}
