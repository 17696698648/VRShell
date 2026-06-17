import { reactive } from 'vue'

export function useConfirmDialog() {
  const confirmDialog = reactive({
    visible: false,
    title: '',
    message: '',
    resolver: null as null | ((value: boolean) => void),
  })

  function askConfirm(title: string, message: string) {
    confirmDialog.title = title
    confirmDialog.message = message
    confirmDialog.visible = true
    return new Promise<boolean>((resolve) => {
      confirmDialog.resolver = resolve
    })
  }

  function resolveConfirm(result: boolean) {
    confirmDialog.visible = false
    confirmDialog.resolver?.(result)
    confirmDialog.resolver = null
  }

  function closeConfirmDialog() {
    if (!confirmDialog.visible) return false
    resolveConfirm(false)
    return true
  }

  return {
    confirmDialog,
    askConfirm,
    resolveConfirm,
    closeConfirmDialog,
  }
}
