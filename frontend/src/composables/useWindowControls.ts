import { getCurrentWindow } from '@tauri-apps/api/window'
import { onMounted, ref } from 'vue'

export function useWindowControls() {
  const appWindow = getCurrentWindow()
  const isWindowMaximized = ref(false)

  async function refreshWindowMaximized() {
    try {
      isWindowMaximized.value = await appWindow.isMaximized()
    } catch {
    }
  }

  async function minimizeWindow() {
    await appWindow.minimize()
  }

  async function toggleMaximizeWindow() {
    await appWindow.toggleMaximize()
    await refreshWindowMaximized()
  }

  async function closeWindow() {
    await appWindow.close()
  }

  onMounted(refreshWindowMaximized)

  return {
    isWindowMaximized,
    minimizeWindow,
    toggleMaximizeWindow,
    closeWindow,
    refreshWindowMaximized,
  }
}
