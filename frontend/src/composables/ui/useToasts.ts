import { ref } from 'vue'
import type { ToastMessage } from '../../types'

export function useToasts(createId: (prefix: string) => string) {
  const toasts = ref<ToastMessage[]>([])

  function showToast(message: string, type: ToastMessage['type'] = 'info') {
    const toast = { id: createId('toast'), message, type }
    toasts.value.push(toast)
    window.setTimeout(() => {
      toasts.value = toasts.value.filter((item) => item.id !== toast.id)
    }, 2600)
  }

  function showComingSoon(feature: string) {
    showToast(`${feature} coming soon`, 'info')
  }

  return {
    toasts,
    showToast,
    showComingSoon,
  }
}
