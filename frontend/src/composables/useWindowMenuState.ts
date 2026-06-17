import {computed, ref} from 'vue'
import type {WindowMenuId} from '../menuTypes'
import {windowMenus} from '../windowMenus'

export function useWindowMenuState() {
  const windowMenuOpen = ref(false)
  const activeWindowMenu = ref<WindowMenuId>('file')

  const activeWindowMenuItems = computed(() => (
    windowMenus.find((menu) => menu.id === activeWindowMenu.value)?.items ?? windowMenus[0].items
  ))

  function toggleWindowMenu() {
    windowMenuOpen.value = !windowMenuOpen.value
    activeWindowMenu.value = 'file'
  }

  function closeWindowMenu() {
    windowMenuOpen.value = false
  }

  return {
    activeWindowMenu,
    activeWindowMenuItems,
    closeWindowMenu,
    toggleWindowMenu,
    windowMenuOpen,
    windowMenus,
  }
}
