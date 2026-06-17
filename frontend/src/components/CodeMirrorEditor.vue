<template>
  <div ref="containerRef" class="codemirror-container"></div>
</template>

<script setup lang="ts">
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { Compartment, Prec } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, StreamLanguage } from '@codemirror/language'
import { searchKeymap } from '@codemirror/search'
import { oneDark } from '@codemirror/theme-one-dark'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// --- Dedicated language packages ---
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { json } from '@codemirror/lang-json'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { rust } from '@codemirror/lang-rust'
import { go } from '@codemirror/lang-go'
import { sql } from '@codemirror/lang-sql'
import { markdown } from '@codemirror/lang-markdown'
import { xml } from '@codemirror/lang-xml'
import { php } from '@codemirror/lang-php'

// --- Legacy StreamLanguage modes for languages lacking a dedicated CM6 package ---
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import { toml } from '@codemirror/legacy-modes/mode/toml'
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile'
import { cpp } from '@codemirror/legacy-modes/mode/clike'
import { java } from '@codemirror/legacy-modes/mode/clike'

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

function resolveLanguage(lang: string) {
  switch (lang) {
    case 'javascript':
    case 'typescript':
      return javascript({ typescript: lang === 'typescript' })
    case 'python':
      return python()
    case 'json':
      return json()
    case 'css':
    case 'scss':
    case 'less':
      return css()
    case 'html':
    case 'handlebars':
    case 'razor':
      return html()
    case 'rust':
      return rust()
    case 'go':
      return go()
    case 'sql':
      return sql()
    case 'markdown':
      return markdown()
    case 'xml':
      return xml()
    case 'php':
      return php()
    case 'shell':
    case 'bash':
    case 'zsh':
    case 'sh':
      return StreamLanguage.define(shell)
    case 'yaml':
    case 'yml':
      return StreamLanguage.define(yaml)
    case 'ruby':
    case 'rb':
      return StreamLanguage.define(ruby)
    case 'toml':
      return StreamLanguage.define(toml)
    case 'dockerfile':
      return StreamLanguage.define(dockerFile)
    case 'cpp':
    case 'c':
    case 'h':
      return StreamLanguage.define(cpp)
    case 'java':
      return StreamLanguage.define(java)
    case 'vue':
      // Vue SFC — basic HTML highlighting as fallback
      return html()
    default:
      return []
  }
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
      languageCompartment.of(resolveLanguage(props.language)),

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
    const view = editorView
    if (!view) return
    view.dispatch({
      effects: languageCompartment.reconfigure(resolveLanguage(lang)),
    })
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
