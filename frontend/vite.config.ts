import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

function manualChunks(id: string) {
  const codeMirrorLanguageChunks: Array<[string, string]> = [
    ['node_modules/@codemirror/lang-javascript', 'cm-lang-javascript'],
    ['node_modules/@codemirror/lang-python', 'cm-lang-python'],
    ['node_modules/@codemirror/lang-json', 'cm-lang-json'],
    ['node_modules/@codemirror/lang-css', 'cm-lang-css'],
    ['node_modules/@codemirror/lang-html', 'cm-lang-html'],
    ['node_modules/@codemirror/lang-rust', 'cm-lang-rust'],
    ['node_modules/@codemirror/lang-go', 'cm-lang-go'],
    ['node_modules/@codemirror/lang-sql', 'cm-lang-sql'],
    ['node_modules/@codemirror/lang-markdown', 'cm-lang-markdown'],
    ['node_modules/@codemirror/lang-xml', 'cm-lang-xml'],
    ['node_modules/@codemirror/lang-php', 'cm-lang-php']
  ]

  for (const [modulePath, chunkName] of codeMirrorLanguageChunks) {
    if (id.includes(modulePath)) {
      return chunkName
    }
  }

  if (id.includes('node_modules/@codemirror/legacy-modes/mode')) {
    return 'cm-legacy-modes'
  }

  if (id.includes('node_modules/@codemirror') || id.includes('node_modules/codemirror')) {
    return 'codemirror'
  }

  if (id.includes('node_modules/element-plus')) {
    return 'element-plus'
  }

  if (id.includes('node_modules/@xterm')) {
    return 'xterm'
  }

  if (id.includes('node_modules')) {
    return 'vendor'
  }
}

export default defineConfig({
  base: './',
  plugins: [vue()],
  optimizeDeps: {
    include: [
      '@tauri-apps/api',
      '@tauri-apps/api/tauri',
      '@tauri-apps/api/event',
      '@tauri-apps/api/core',
      '@xterm/xterm',
      '@xterm/addon-fit',
      '@xterm/addon-search'
    ]
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      external: [],
      onLog(level, log, handler) {
        if (log.code === 'INVALID_ANNOTATION' && log.loc?.file?.includes('@vueuse/core')) {
          return
        }

        handler(level, log)
      },
      output: {
        manualChunks
      }
    }
  },
  test: {
    exclude: ['e2e/**', 'node_modules/**', 'dist/**']
  }
})
