import {readFileSync} from 'node:fs'

const checks = [
  {
    file: 'src/shared/ui/UiDataGrid.vue',
    patterns: ['@keydown="handleGridKeydown"', 'name="empty"', 'aria-rowcount', 'emit(\'select\''],
  },
  {
    file: 'src/shared/ui/UiCommandMenu.vue',
    patterns: ['onMounted(() => focusFirstItem())', 'focusTypeahead', "event.key === 'Enter'", "event.key === 'Escape'"],
  },
  {
    file: 'src/shared/ui/UiTree.vue',
    patterns: ['aria-level', 'aria-expanded', 'selectedKey', 'emit(\'select\''],
  },
  {
    file: 'src/shared/ui/UiDataGrid.vue',
    forbidden: ['↑', '↓'],
  },
  {
    file: 'src/widgets/sftp-explorer/ui/SftpToolbar.vue',
    forbidden: ['↑', '↓'],
  },
]

let failed = false
for (const check of checks) {
  const source = readFileSync(new URL(`../${check.file}`, import.meta.url), 'utf8')
  for (const pattern of check.patterns ?? []) {
    if (!source.includes(pattern)) {
      console.error(`UI guard failed: ${check.file} is missing ${pattern}`)
      failed = true
    }
  }
  for (const pattern of check.forbidden ?? []) {
    if (source.includes(pattern)) {
      console.error(`UI guard failed: ${check.file} still contains ${pattern}`)
      failed = true
    }
  }
}

if (failed) process.exit(1)
console.log('UI quality guards passed')
