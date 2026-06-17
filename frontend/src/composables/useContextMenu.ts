import { reactive } from 'vue'
import type { ContextMenuType } from '../components/SessionTreeGroup.vue'
import type { ContextMenuScope } from '../menuTypes'
import type { SftpFileItem } from '../types'

export type ContextMenuState = {
  visible: boolean
  type: ContextMenuScope
  targetId: string
  x: number
  y: number
}

export function useContextMenu() {
  const contextMenu = reactive<ContextMenuState>({
    visible: false,
    type: 'group' as ContextMenuScope,
    targetId: '',
    x: 0,
    y: 0,
  })

  function openContextMenu(event: MouseEvent, type: ContextMenuType, targetId: string) {
    event.preventDefault()
    event.stopPropagation()
    contextMenu.visible = true
    contextMenu.type = type
    contextMenu.targetId = targetId
    contextMenu.x = event.clientX
    contextMenu.y = event.clientY
  }

  function openEditorTabContextMenu(event: MouseEvent, filePath: string) {
    openContextMenuAt(event, 'editor-tab', filePath)
  }

  function openSessionTabContextMenu(event: MouseEvent, hostName: string) {
    openContextMenuAt(event, 'session-tab', hostName)
  }

  function openTerminalTabContextMenu(event: MouseEvent, terminalId: string) {
    openContextMenuAt(event, 'terminal-tab', terminalId)
  }

  function openContextMenuAt(event: MouseEvent, type: ContextMenuScope, targetId: string) {
    event.preventDefault()
    event.stopPropagation()
    contextMenu.visible = true
    contextMenu.type = type
    contextMenu.targetId = targetId
    contextMenu.x = event.clientX
    contextMenu.y = event.clientY
  }

  function openSftpContextMenu(event: MouseEvent, file: SftpFileItem) {
    event.preventDefault()
    event.stopPropagation()
    contextMenu.visible = true
    contextMenu.type = file.isDirectory ? 'sftp-directory' : 'sftp-file'
    contextMenu.targetId = file.path
    contextMenu.x = event.clientX
    contextMenu.y = event.clientY
  }

  function closeContextMenu() {
    contextMenu.visible = false
  }

  return {
    contextMenu,
    openContextMenu,
    openContextMenuAt,
    openEditorTabContextMenu,
    openSessionTabContextMenu,
    openTerminalTabContextMenu,
    openSftpContextMenu,
    closeContextMenu,
  }
}
