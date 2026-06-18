import { reactive } from 'vue'
import type { SftpTreeNode } from '../../types'

export function useSftpInfoPopover() {
  const sftpInfoPopover = reactive({
    visible: false,
    file: null as SftpTreeNode | null,
    x: 0,
    y: 0,
  })
  let hideTimer: number | null = null

  function clearHideTimer() {
    if (hideTimer) {
      window.clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  function showSftpInfoPopover(event: MouseEvent, file: SftpTreeNode) {
    const viewportPadding = 12
    const popoverWidth = 260
    clearHideTimer()
    sftpInfoPopover.file = file
    sftpInfoPopover.x = Math.max(viewportPadding, Math.min(event.clientX + 10, window.innerWidth - popoverWidth - viewportPadding))
    sftpInfoPopover.y = Math.max(viewportPadding, Math.min(event.clientY + 10, window.innerHeight - 128))
    sftpInfoPopover.visible = true
  }

  function keepSftpInfoPopover() {
    clearHideTimer()
    sftpInfoPopover.visible = Boolean(sftpInfoPopover.file)
  }

  function hideSftpInfoPopover() {
    clearHideTimer()
    hideTimer = window.setTimeout(() => {
      sftpInfoPopover.visible = false
      hideTimer = null
    }, 120)
  }

  return {
    sftpInfoPopover,
    showSftpInfoPopover,
    keepSftpInfoPopover,
    hideSftpInfoPopover,
  }
}
