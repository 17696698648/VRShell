import {reactive} from 'vue'

export type ContextMenuItem = ContextMenuActionItem | ContextMenuSeparatorItem

export interface ContextMenuActionItem {
  id: string
  label: string
  disabled?: boolean
  danger?: boolean
  type?: 'item'
  run: () => void | Promise<void>
}

export interface ContextMenuSeparatorItem {
  id: string
  type: 'separator'
}

export interface ContextMenuRequest {
  x: number
  y: number
  items: ContextMenuItem[]
}

export const contextMenuState = reactive({
  menu: null as ContextMenuRequest | null,
})

export function openContextMenu(menu: ContextMenuRequest) {
  contextMenuState.menu = menu
}

export function closeContextMenu() {
  contextMenuState.menu = null
}

export async function executeContextMenuItem(item: ContextMenuItem) {
  if (item.type === 'separator' || item.disabled) return
  closeContextMenu()
  await item.run()
}
