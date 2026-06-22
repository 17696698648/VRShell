import {readdirSync, readFileSync, statSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {join, relative} from 'node:path'

const root = new URL('..', import.meta.url)
const rootPath = fileURLToPath(root)
const checks = [
  {
    file: 'src/shared/ui/UiDataGrid.vue',
    patterns: ['@keydown="handleGridKeydown"', 'name="empty"', 'aria-rowcount', 'emit(\'select\'', 'getCellProps'],
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
    file: 'src/shell/status-bar/model/statusBar.types.ts',
    patterns: ['StatusBarIconName', 'compactLabel', 'fullLabel', 'tooltip'],
  },
]

let failed = false
for (const check of checks) {
  const source = readProjectFile(check.file)
  for (const pattern of check.patterns ?? []) assert(source.includes(pattern), `${check.file} is missing ${pattern}`)
}

for (const file of listSourceFiles('src')) {
  const source = readProjectFile(file)
  assert(!/[↑↓]/.test(source), `${file} contains raw arrow glyphs; use icon components or text shortcuts`)
  assertNoUnlabelledIconButton(file, source)
}

const statusItems = readProjectFile('src/shell/status-bar/model/registerDefaultStatusItems.ts')
for (const match of statusItems.matchAll(/label:\s*`([^`]+)`|label:\s*'([^']+)'|label:\s*"([^"]+)"/g)) {
  const label = match[1] ?? match[2] ?? match[3] ?? ''
  if (label.includes('${')) continue
  assert(label.length <= 24, `StatusBar label is too long: ${label}`)
}

if (failed) process.exit(1)
console.log('UI quality guards passed')

function assert(condition, message) {
  if (condition) return
  console.error(`UI guard failed: ${message}`)
  failed = true
}

function assertNoUnlabelledIconButton(file, source) {
  for (const match of source.matchAll(/<UiIconButton\b([^>]*)>/g)) {
    const attrs = match[1] ?? ''
    assert(/\blabel=/.test(attrs) || /\baria-label=/.test(attrs), `${file} has UiIconButton without label`)
  }
}

function listSourceFiles(directory) {
  const absolute = fileURLToPath(new URL(directory, root))
  const files = []
  walk(absolute, files)
  return files
    .filter((file) => /\.(ts|vue)$/.test(file))
    .map((file) => relative(rootPath, file).replaceAll('\\', '/'))
}

function walk(directory, files) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (entry === 'node_modules' || entry === 'dist') continue
    if (statSync(path).isDirectory()) walk(path, files)
    else files.push(path)
  }
}

function readProjectFile(file) {
  return readFileSync(new URL(file, root), 'utf8')
}
