import {readdirSync, readFileSync, statSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join, normalize, relative} from 'node:path'

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
  {
    file: 'scripts/check-frontend-guards.mjs',
    patterns: ['assertLayerImports(file, source)', 'function assertLayerImports(file, source)', 'function isAllowedLayerImport(fromLayer, toLayer)'],
  },
  {
    file: 'src/shared/ui/index.ts',
    patterns: ["export type {PanelBodyState} from './panelBodyState'"],
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
  assertNoDirectIpcClientImport(file, source)
  assertNoSecretsInStore(file, source)
  assertNoDirectTauriWindowApi(file, source)
  assertNoReverseDependency(file, source)
  assertLayerImports(file, source)
  assertUiDesignBaseline(file, source)
}

assertTerminalOutputStaysOutsideReactiveStore()
assertSessionNodeDoesNotConnectOnSingleClick()
assertVisualSnapshotsExist()

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
  if (file.endsWith('src/shell/styles/jetbrains-theme.css')) return
  const matches = [...source.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)]
    .filter((match) => !isAllowedColorMatch(source, match.index ?? 0))
    .map((match) => match[0])
  assert(matches.length === 0, `${file} contains hardcoded colors (${[...new Set(matches)].join(', ')}); use theme tokens`)
}

function isAllowedColorMatch(source, index) {
  const lineStart = source.lastIndexOf('\n', index) + 1
  const lineEnd = source.indexOf('\n', index)
  const line = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd)
  return line.includes('<template #') || line.includes('color-mix(') || /^\s*--[\w-]+\s*:/.test(line)
}

function assertNoDirectTauriInvoke(file, source) {
  if (file.startsWith('src/shared/ipc/')) return
  assert(!source.includes('@tauri-apps/api/core'), `${file} imports Tauri core directly; use shared/ipc typedInvoke`)
  assert(!/\btauriInvoke\b|\binvoke\s*\(/.test(source), `${file} may call Tauri invoke directly; use repository APIs`)
}

/**
 * Guard: 禁止 features/widgets/pages/shell 直接 import ipcClient
 * 业务代码应通过 ipcFacade 调用语义 API
 */
function assertNoDirectIpcClientImport(file, source) {
  // 允许 ipc 目录内部和 repository 使用
  if (file.startsWith('src/shared/ipc/')) return
  if (file.includes('/api/') && file.includes('Repository')) return
  assert(!source.includes("from '../../../shared/ipc/ipcClient'") &&
         !source.includes("from '../../shared/ipc/ipcClient'") &&
         !source.includes("from '../ipc/ipcClient'"),
    `${file} imports ipcClient directly; use ipcFacade or repository APIs`)
}

/**
 * Guard: 禁止 store 文件出现 password、passphrase 字段
 * 凭据应通过 credentialRef 引用，不进入响应式状态
 */
function assertNoSecretsInStore(file, source) {
  if (!file.includes('.store.ts')) return
  if (file.includes('/__tests__/')) return
  assert(!/\bpassword\s*[:=]/.test(source) && !/\bpassphrase\s*[:=]/.test(source),
    `${file} contains password/passphrase field; use credentialRef instead`)
}

/**
 * Guard: 禁止非 shared/window 直接 import Tauri window API
 */
function assertNoDirectTauriWindowApi(file, source) {
  if (file.startsWith('src/shared/window/')) return
  if (file.startsWith('src/shared/ipc/')) return
  if (file.startsWith('src/shell/titlebar/')) return
  assert(!source.includes('@tauri-apps/api/window') && !source.includes('@tauri-apps/api/webviewWindow'),
    `${file} imports Tauri window API directly; use shared/window abstraction`)
}

/**
 * Guard: 禁止 entities 反向依赖 features/widgets/pages/shell
 */
function assertNoReverseDependency(file, source) {
  if (!file.startsWith('src/entities/')) return
  assert(!source.includes("from '../../features/") &&
         !source.includes("from '../../widgets/") &&
         !source.includes("from '../../pages/") &&
         !source.includes("from '../../shell/"),
    `${file} has reverse dependency on features/widgets/pages/shell; entities should be leaf modules`)
}

function assertLayerImports(file, source) {
  if (file.includes('/__tests__/')) return
  const fromLayer = getLayer(file)
  if (!fromLayer) return
  for (const importPath of getImportPaths(source)) {
    const targetFile = resolveImportPath(file, importPath)
    if (!targetFile) continue
    const toLayer = getLayer(targetFile)
    if (!toLayer || toLayer === fromLayer) continue
    assert(isAllowedLayerImport(fromLayer, toLayer), `${file} imports ${targetFile}; ${fromLayer} must not depend on ${toLayer}`)
  }
}

function getImportPaths(source) {
  return [...source.matchAll(/import(?:\s+type)?(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g)].map((match) => match[1])
}

function resolveImportPath(file, importPath) {
  if (!importPath.startsWith('.')) return null
  const resolved = normalize(join(dirname(file), importPath)).replaceAll('\\', '/')
  return resolved.startsWith('src/') ? resolved : null
}

function getLayer(file) {
  return ['app', 'pages', 'shell', 'widgets', 'features', 'entities', 'shared'].find((layer) => file.startsWith(`src/${layer}/`)) ?? null
}

function isAllowedLayerImport(fromLayer, toLayer) {
  const forbidden = {
    shared: new Set(['entities', 'features', 'widgets', 'shell', 'pages', 'app']),
    entities: new Set(['features', 'widgets', 'shell', 'pages', 'app']),
    features: new Set(['widgets', 'shell', 'pages', 'app']),
    widgets: new Set(['shell', 'pages', 'app']),
    shell: new Set(['app']),
    pages: new Set(['app']),
  }
  return !(forbidden[fromLayer]?.has(toLayer))
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

function assertUiDesignBaseline(file, source) {
  assertSettingsUseSharedFormControls(file, source)
  assertSessionFormAvoidsNakedControls(file, source)
  assertNoLegacyUiTokens(file, source)
  assertWorkbenchAvoidsCardChrome(file, source)
}

function assertSettingsUseSharedFormControls(file, source) {
  if (!file.startsWith('src/pages/settings/') || !file.endsWith('.vue')) return
  assert(!/<(?:input|select)\b/.test(source), `${file} uses naked input/select; use UiInput or UiSelect`)
}

function assertSessionFormAvoidsNakedControls(file, source) {
  if (!file.endsWith('session-explorer/ui/session-explorer.css')) return
  assert(!/\.session-form\s+(?:input|select|button)\b/.test(source), `${file} styles naked session-form controls; use shared form components`)
}

function assertNoLegacyUiTokens(file, source) {
  if (!/\.(css|vue)$/.test(file)) return
  if (file.startsWith('src/shared/theme/')) return
  const guardedFiles = new Set([
    'src/widgets/session-explorer/ui/session-explorer.css',
    'src/widgets/sftp-explorer/ui/sftp-explorer.css',
    'src/shell/dock/dock.css',
    'src/shell/styles/jetbrains-theme.css',
    'src/shell/styles/overlays.css',
  ])
  if (!guardedFiles.has(file)) return
  const legacyTokens = ['--color-surface', '--color-surface-2', '--color-border)', '--color-text)', '--color-muted)']
  const matches = legacyTokens.filter((token) => source.includes(token))
  assert(matches.length === 0, `${file} uses legacy UI tokens (${matches.join(', ')}); prefer tool-window/text/border semantic tokens`)
}

function assertWorkbenchAvoidsCardChrome(file, source) {
  if (!file.endsWith('.css')) return
  const workbenchCss = file.includes('/workbench-layout/') || file.includes('/session-workbench/') || file.includes('/editor-workbench/') || file.endsWith('src/shell/styles/shell.css') || file.endsWith('src/shell/dock/dock.css')
  if (!workbenchCss) return
  const withoutResponsiveDrawer = source.replace(/\.workbench-shell__sidebar-left-resize\s*\{[\s\S]*?\}/g, '')
  assert(!/box-shadow:\s*var\(--shadow-(?:soft|panel|card-hover|glow)\)/.test(withoutResponsiveDrawer), `${file} adds card shadow inside workbench; use dividers/embedded panels`)
  assert(!/border-radius:\s*var\(--radius-(?:xl|2xl)\)/.test(withoutResponsiveDrawer), `${file} adds large radius inside workbench; use embedded square panels`)
}

function assertVisualSnapshotsExist() {
  const visualSpec = readProjectFile('e2e/visual.spec.ts')
  const requiredSnapshots = [...visualSpec.matchAll(/toHaveScreenshot\(['"]([^'"]+)['"]\)/g)].map((match) => match[1])
  for (const snapshot of requiredSnapshots) {
    const snapshotFile = `e2e/visual.spec.ts-snapshots/${snapshot.replace(/\.png$/, '')}-chromium-win32.png`
    assert(fileExists(snapshotFile), `${snapshotFile} is missing; run visual tests with --update-snapshots`)
  }
}

function fileExists(file) {
  try {
    statSync(new URL(file, root))
    return true
  } catch {
    return false
  }
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
