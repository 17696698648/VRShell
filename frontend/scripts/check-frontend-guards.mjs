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
  assertNoHardcodedColors(file, source)
  assertNoDirectTauriInvoke(file, source)
  assertNoFeatureCommandRegistryImport(file, source)
  assertNoDirectPushToast(file, source)
}

assertTerminalOutputStaysOutsideReactiveStore()
assertSessionNodeDoesNotConnectOnSingleClick()

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

function assertNoHardcodedColors(file, source) {
  if (file.startsWith('src/shared/theme/')) return
  const matches = [...source.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)]
    .filter((match) => !isAllowedColorMatch(source, match.index ?? 0))
    .map((match) => match[0])
  assert(matches.length === 0, `${file} contains hardcoded colors (${[...new Set(matches)].join(', ')}); use theme tokens`)
}

function isAllowedColorMatch(source, index) {
  const lineStart = source.lastIndexOf('\n', index) + 1
  const lineEnd = source.indexOf('\n', index)
  const line = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd)
  return line.includes('<template #') || line.includes('color-mix(')
}

function assertNoDirectTauriInvoke(file, source) {
  if (file.startsWith('src/shared/ipc/')) return
  assert(!source.includes('@tauri-apps/api/core'), `${file} imports Tauri core directly; use shared/ipc typedInvoke`)
  assert(!/\btauriInvoke\b|\binvoke\s*\(/.test(source), `${file} may call Tauri invoke directly; use repository APIs`)
}

function assertNoFeatureCommandRegistryImport(file, source) {
  if (file === 'src/shared/command/commandRegistry.ts' || file.startsWith('src/features/workspace/')) return
  assert(!source.includes('features/workspace/command-registry'), `${file} imports feature command registry directly; use shared/command`)
}

function assertNoDirectPushToast(file, source) {
  if (file.startsWith('src/shared/feedback/')) return
  if (file.includes('/__tests__/')) return
  assert(!/\bpushToast\s*\(/.test(source), `${file} calls pushToast directly; use shared/feedback notifyFeedback helpers`)
  assert(!/import\s*\{[^}]*\bpushToast\b/.test(source), `${file} imports pushToast directly; use shared/feedback notifyFeedback helpers`)
}

function assertTerminalOutputStaysOutsideReactiveStore() {
  const store = readProjectFile('src/entities/terminal/model/terminal.store.ts')
  assert(!/\.lines\s*=/.test(store), 'terminal.store.ts mutates tab.lines; terminal output must stay outside reactive store')
}

function assertSessionNodeDoesNotConnectOnSingleClick() {
  const source = readProjectFile('src/widgets/session-explorer/ui/SessionTreeNode.vue')
  assert(!source.includes('@click="connectSession'), 'SessionTreeNode should not connect on single click; use select on click and connect on double-click/Enter/action')
  assert(source.includes('@dblclick="connectSession'), 'SessionTreeNode should support double-click to connect')
}

function listSourceFiles(directory) {
  const absolute = fileURLToPath(new URL(directory, root))
  const files = []
  walk(absolute, files)
  return files
    .filter((file) => /\.(ts|vue|css)$/.test(file))
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
