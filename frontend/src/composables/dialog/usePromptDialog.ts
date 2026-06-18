import { reactive, ref, nextTick } from 'vue'

export interface PromptOptions {
  title: string
  message?: string
  placeholder?: string
  defaultValue?: string
  /** Set to 'password' for masked input. */
  inputType?: 'text' | 'password'
  /** Validation function — return an error string or null if valid. */
  validate?: (value: string) => string | null
}

export function usePromptDialog() {
  const promptDialog = reactive({
    visible: false,
    title: '',
    message: '',
    placeholder: '',
    defaultValue: '',
    inputType: 'text' as 'text' | 'password',
    validationError: null as string | null,
    resolver: null as null | ((value: string | null) => void),
  })

  const inputValue = ref('')
  const inputRef = ref<HTMLInputElement | null>(null)

  function askPrompt(options: PromptOptions): Promise<string | null> {
    promptDialog.title = options.title
    promptDialog.message = options.message ?? ''
    promptDialog.placeholder = options.placeholder ?? ''
    promptDialog.defaultValue = options.defaultValue ?? ''
    promptDialog.inputType = options.inputType ?? 'text'
    promptDialog.validationError = null
    promptDialog.visible = true
    inputValue.value = options.defaultValue ?? ''

    // Focus the input after render.
    nextTick(() => {
      inputRef.value?.focus()
      inputRef.value?.select()
    })

    return new Promise<string | null>((resolve) => {
      promptDialog.resolver = resolve
    })
  }

  function confirmPrompt() {
    const val = inputValue.value.trim()
    if (!val) {
      promptDialog.validationError = 'Value cannot be empty'
      return
    }
    resolvePrompt(val)
  }

  function resolvePrompt(value: string | null) {
    promptDialog.visible = false
    promptDialog.resolver?.(value)
    promptDialog.resolver = null
    promptDialog.validationError = null
    inputValue.value = ''
  }

  function cancelPrompt() {
    resolvePrompt(null)
  }

  function closePromptDialog() {
    if (!promptDialog.visible) return false
    cancelPrompt()
    return true
  }

  return {
    promptDialog,
    inputValue,
    inputRef,
    askPrompt,
    confirmPrompt,
    cancelPrompt,
    resolvePrompt,
    closePromptDialog,
  }
}
