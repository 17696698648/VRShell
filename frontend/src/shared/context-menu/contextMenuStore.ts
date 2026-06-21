import {reactive} from 'vue'

export interface ContextMenuItem {
  id: string
  label: string
  disabled?: boolean
  danger?: boolean
  run: () => void | Promise<void>
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
  if (item.disabled) return
  closeContextMenu()
  await item.run()
}
