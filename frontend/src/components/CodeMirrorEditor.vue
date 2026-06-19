<template>
  <div ref="containerRef" class="codemirror-container"></div>
</template>

<script setup lang="ts">
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { Compartment, Prec, type Extension } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, StreamLanguage } from '@codemirror/language'
import { searchKeymap } from '@codemirror/search'
import { oneDark } from '@codemirror/theme-one-dark'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  language: string
  path?: string
  theme?: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'save'): void
}>()

const containerRef = ref<HTMLElement | null>(null)
let editorView: EditorView | null = null
const languageCompartment = new Compartment()
let isApplyingExternalValue = false
let languageLoadToken = 0

async function resolveLanguage(lang: string): Promise<Extension> {
  switch (lang) {
    case 'javascript':
    case 'typescript': {
      const { javascript } = await import('@codemirror/lang-javascript')
      return javascript({ typescript: lang === 'typescript' })
    }
    case 'python': {
      const { python } = await import('@codemirror/lang-python')
      return python()
    }
    case 'json': {
      const { json } = await import('@codemirror/lang-json')
      return json()
    }
    case 'css':
    case 'scss':
    case 'less': {
      const { css } = await import('@codemirror/lang-css')
      return css()
    }
    case 'html':
    case 'handlebars':
    case 'razor': {
      const { html } = await import('@codemirror/lang-html')
      return html()
    }
    case 'rust': {
      const { rust } = await import('@codemirror/lang-rust')
      return rust()
    }
    case 'go': {
      const { go } = await import('@codemirror/lang-go')
      return go()
    }
    case 'sql': {
      const { sql } = await import('@codemirror/lang-sql')
      return sql()
    }
    case 'markdown': {
      const { markdown } = await import('@codemirror/lang-markdown')
      return markdown()
    }
    case 'xml': {
      const { xml } = await import('@codemirror/lang-xml')
      return xml()
    }
    case 'php': {
      const { php } = await import('@codemirror/lang-php')
      return php()
    }
    case 'shell':
    case 'bash':
    case 'zsh':
    case 'sh': {
      const { shell } = await import('@codemirror/legacy-modes/mode/shell')
      return StreamLanguage.define(shell)
    }
    case 'yaml':
    case 'yml': {
      const { yaml } = await import('@codemirror/legacy-modes/mode/yaml')
      return StreamLanguage.define(yaml)
    }
    case 'ruby':
    case 'rb': {
      const { ruby } = await import('@codemirror/legacy-modes/mode/ruby')
      return StreamLanguage.define(ruby)
    }
    case 'toml': {
      const { toml } = await import('@codemirror/legacy-modes/mode/toml')
      return StreamLanguage.define(toml)
    }
    case 'dockerfile': {
      const { dockerFile } = await import('@codemirror/legacy-modes/mode/dockerfile')
      return StreamLanguage.define(dockerFile)
    }
    case 'cpp':
    case 'c':
    case 'h': {
      const { cpp } = await import('@codemirror/legacy-modes/mode/clike')
      return StreamLanguage.define(cpp)
    }
    case 'java': {
      const { java } = await import('@codemirror/legacy-modes/mode/clike')
      return StreamLanguage.define(java)
    }
    case 'vue': {
      const { html } = await import('@codemirror/lang-html')
      return html()
    }
    default:
      return []
  }
}

async function configureLanguage(lang: string) {
  const token = ++languageLoadToken
  const extension = await resolveLanguage(lang)
  const view = editorView
  if (!view || token !== languageLoadToken) return

  view.dispatch({
    effects: languageCompartment.reconfigure(extension),
  })
}

onMounted(async () => {
  await nextTick()
  if (!containerRef.value) return

  // Ctrl+S handler — use Prec.highest to override any other keybindings
  const saveKeymap = Prec.highest(
    keymap.of([
      {
        key: 'Mod-s',
        run: () => {
          emit('save')
          return true
        },
        preventDefault: true,
      },
    ]),
  )

  editorView = new EditorView({
    doc: props.modelValue,
    extensions: [
      // Editor behavior
      lineNumbers(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
      saveKeymap,
      EditorView.lineWrapping,

      // Document change notification
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isApplyingExternalValue) {
          emit('update:modelValue', update.state.doc.toString())
        }
      }),

      // Language — set via compartment for dynamic switching
      languageCompartment.of([]),

      // Theme
      oneDark,
      syntaxHighlighting(defaultHighlightStyle),

      // Custom styling to match VRShell dark UI
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '13px',
          backgroundColor: 'transparent',
        },
        '.cm-scroller': {
          fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
          lineHeight: '1.62',
        },
        '.cm-gutters': {
          borderRight: '1px solid rgba(148,163,184,0.14)',
          backgroundColor: 'transparent',
          color: 'rgba(148,163,184,0.45)',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'rgba(56,189,248,0.08)',
        },
      }),
    ],
    parent: containerRef.value,
  })

  void configureLanguage(props.language)
})

watch(
  () => props.modelValue,
  (value) => {
    const view = editorView
    if (!view) return
    const current = view.state.doc.toString()
    if (value !== current) {
      isApplyingExternalValue = true
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
      isApplyingExternalValue = false
    }
  },
)

watch(
  () => props.language,
  (lang) => {
    void configureLanguage(lang)
  },
)

onBeforeUnmount(() => {
  editorView?.destroy()
  editorView = null
})
</script>

<style scoped>
.codemirror-container {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.codemirror-container :deep(.cm-editor) {
  height: 100%;
}
</style>
