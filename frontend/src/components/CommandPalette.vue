<template>
  <div v-if="visible" class="command-palette-backdrop" @click="close">
    <div class="command-palette" data-testid="command-palette" @click.stop>
      <div class="palette-input-row">
        <Search :size="16" class="palette-search-icon"/>
        <input
          ref="searchInputRef"
          v-model="query"
          type="text"
          placeholder="搜索命令或会话..."
          class="palette-search"
          data-testid="command-palette-search"
          @keydown="handleKeydown"
          @input="handleInput"
        />
        <kbd>esc</kbd>
      </div>

      <div
        class="palette-results"
        ref="resultsContainerRef"
        role="listbox"
        :aria-activedescendant="activeOptionId"
        @scroll="updateVirtualWindow"
      >
        <template v-if="flatItems.length === 0">
          <div class="palette-empty">No matching commands</div>
        </template>

        <div v-else class="palette-virtual-list" :style="{ height: virtualTotalHeight + 'px' }">
          <div class="palette-virtual-window" :style="{ transform: `translateY(${virtualTopPadding}px)` }">
          <button
              v-for="entry in virtualEntries"
              :key="entry.item.id"
              :id="getOptionId(entry.index)"
            class="palette-item"
              :data-command-id="entry.item.id"
              role="option"
              :aria-selected="activeIndex === entry.index"
              :class="{ active: activeIndex === entry.index }"
              @click="executeCommand(entry.item)"
              @mouseenter="activeIndex = entry.index"
          >
              <component :is="entry.item.icon" :size="16" class="palette-item-icon"/>
            <div class="palette-item-text">
                <span class="palette-item-label">{{ entry.item.label }}</span>
                <span v-if="entry.item.description" class="palette-item-desc">{{ entry.item.description }}</span>
            </div>
              <kbd v-if="entry.item.shortcut">{{ entry.item.shortcut }}</kbd>
          </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Cable,
  Code2,
  FolderOpen,
  FolderPlus,
  Monitor,
  Palette,
  Power,
  RefreshCw,
  Search,
  Settings,
  Terminal,
  Trash2,
  X,
} from '@lucide/vue'
import {computed, nextTick, ref, watch} from 'vue'

type CommandAction =
  | 'new_connection'
  | 'local_terminal'
  | 'close_session'
  | 'toggle_sessions'
  | 'toggle_sftp'
  | 'collapse_groups'
  | 'refresh_sftp'
  | 'connect_session'
  | 'edit_session'
  | 'delete_session'
  | 'switch_theme'
  | 'ssh_hash_known_hosts'
  | 'ssh_auto_reconnect'
  | 'show_shortcuts'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: any
  action: CommandAction
  shortcut?: string
  payload?: string
  searchText?: string
}

interface CommandGroup {
  label: string
  items: CommandItem[]
}

const props = defineProps<{
  visible: boolean
  sessionNames: string[]
  groupNames: string[]
  activeTheme: string
  themeNames: { id: string; name: string }[]
  hasActiveSession: boolean
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'execute', action: CommandAction, payload?: string): void
}>()

const PALETTE_ROW_HEIGHT = 48
const PALETTE_OVERSCAN = 6

const query = ref('')
const activeIndex = ref(0)
const virtualStartIndex = ref(0)
const virtualEndIndex = ref(0)
const searchInputRef = ref<HTMLInputElement | null>(null)
const resultsContainerRef = ref<HTMLElement | null>(null)

const baseCommands: CommandGroup[] = [
  {
    label: '连接',
    items: [
      {
        id: 'cmd-new-connection',
        label: '新建连接',
        description: '创建新的 SSH 会话',
        icon: Cable,
        action: 'new_connection',
        shortcut: 'Ctrl+N'
      },
      {
        id: 'cmd-local-terminal',
        label: '打开本地终端',
        description: '在本地 Shell 中打开',
        icon: Terminal,
        action: 'local_terminal'
      },
      {
        id: 'cmd-close-session',
        label: '关闭当前会话',
        description: '断开并关闭会话标签',
        icon: X,
        action: 'close_session',
        shortcut: 'Ctrl+W'
      },
    ],
  },
  {
    label: '视图',
    items: [
      {
        id: 'cmd-toggle-sessions',
        label: '切换会话面板',
        description: '显示/隐藏会话树',
        icon: FolderOpen,
        action: 'toggle_sessions'
      },
      {
        id: 'cmd-toggle-sftp',
        label: '切换 SFTP 面板',
        description: '显示/隐藏文件浏览器',
        icon: FolderOpen,
        action: 'toggle_sftp'
      },
      {
        id: 'cmd-collapse-groups',
        label: '折叠所有分组',
        description: '收起所有会话分组',
        icon: FolderPlus,
        action: 'collapse_groups'
      },
    ],
  },
  {
    label: '主题',
    items: [],
  },
  {
    label: '工具',
    items: [
      {
        id: 'cmd-refresh-sftp',
        label: '刷新 SFTP',
        description: '重新加载远程文件列表',
        icon: RefreshCw,
        action: 'refresh_sftp'
      },
    ],
  },
  {
    label: 'SSH 设置',
    items: [
      {
        id: 'cmd-hash-known-hosts',
        label: '切换主机名哈希',
        description: '写入 known_hosts 时对主机名进行哈希',
        icon: Settings,
        action: 'ssh_hash_known_hosts'
      },
      {
        id: 'cmd-auto-reconnect',
        label: '切换自动重连',
        description: '断开后自动重连（最多3次）',
        icon: Settings,
        action: 'ssh_auto_reconnect'
      },
      {
        id: 'cmd-show-shortcuts',
        label: '快捷键帮助',
        description: '查看命令面板、标签、SFTP、广播输入等快捷键',
        icon: Settings,
        action: 'show_shortcuts',
        shortcut: 'Ctrl+/'
      },
    ],
  },
]

const themeItems: CommandItem[] = props.themeNames.map((theme) => ({
  id: `cmd-theme-${theme.id}`,
  label: theme.name,
  description: theme.id === props.activeTheme ? '当前主题' : undefined,
  icon: Palette,
  action: 'switch_theme' as const,
  payload: theme.id,
}))

const sessionCommands: CommandItem[] = [
  ...props.sessionNames.map((name) => ({
    id: `cmd-connect-${name}`,
    label: name,
    description: '连接到此会话',
    icon: Monitor,
    action: 'connect_session' as const,
    payload: name,
  })),
]

function withSearchText(item: CommandItem): CommandItem {
  return {
    ...item,
    searchText: `${item.label} ${item.description ?? ''} ${item.payload ?? ''}`.toLowerCase(),
  }
}

const allGroups = computed<CommandGroup[]>(() => {
  const groups = baseCommands.map((group) => {
    if (group.label === '主题') {
      return {label: '主题', items: themeItems.map(withSearchText)}
    }
    return {...group, items: group.items.map(withSearchText)}
  })

  if (sessionCommands.length > 0) {
    groups.push({label: '会话', items: sessionCommands.map(withSearchText)})
  }

  return groups
})

function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) qi++
  }
  return qi === lowerQuery.length
}

const filteredGroups = computed(() => {
  const q = query.value.trim()
  if (!q) return allGroups.value

  return allGroups.value
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => fuzzyMatch(item.searchText ?? item.label, q.toLowerCase()),
      ),
    }))
    .filter((group) => group.items.length > 0)
})

const flatItems = computed(() => filteredGroups.value.flatMap((g) => g.items))
const virtualTotalHeight = computed(() => flatItems.value.length * PALETTE_ROW_HEIGHT)
const virtualTopPadding = computed(() => virtualStartIndex.value * PALETTE_ROW_HEIGHT)
const virtualEntries = computed(() => flatItems.value
  .slice(virtualStartIndex.value, virtualEndIndex.value)
  .map((item, offset) => ({item, index: virtualStartIndex.value + offset})))
const activeOptionId = computed(() => flatItems.value[activeIndex.value] ? getOptionId(activeIndex.value) : undefined)

function getGlobalIndex(groupLabel: string, itemIndex: number): number {
  let offset = 0
  for (const group of filteredGroups.value) {
    if (group.label === groupLabel) return offset + itemIndex
    offset += group.items.length
  }
  return offset
}

function handleInput() {
  activeIndex.value = 0
  updateVirtualWindow()
}

function handleKeydown(event: KeyboardEvent) {
  const total = flatItems.value.length
  if (total === 0) {
    if (event.key === 'Escape') close()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % total
    scrollToActive()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + total) % total
    scrollToActive()
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const item = flatItems.value[activeIndex.value]
    if (item) executeCommand(item)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

function scrollToActive() {
  nextTick(() => {
    const container = resultsContainerRef.value
    if (!container) return
    const itemTop = activeIndex.value * PALETTE_ROW_HEIGHT
    const itemBottom = itemTop + PALETTE_ROW_HEIGHT
    if (itemTop < container.scrollTop) {
      container.scrollTop = itemTop
    } else if (itemBottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = itemBottom - container.clientHeight
    }
    updateVirtualWindow()
  })
}

function updateVirtualWindow() {
  const container = resultsContainerRef.value
  const visibleRows = container ? Math.ceil(container.clientHeight / PALETTE_ROW_HEIGHT) : 10
  const scrollTop = container?.scrollTop ?? 0
  virtualStartIndex.value = Math.max(0, Math.floor(scrollTop / PALETTE_ROW_HEIGHT) - PALETTE_OVERSCAN)
  virtualEndIndex.value = Math.min(flatItems.value.length, virtualStartIndex.value + visibleRows + PALETTE_OVERSCAN * 2)
}

function getOptionId(index: number) {
  return `command-palette-option-${index}`
}

function executeCommand(item: CommandItem) {
  if (item.payload !== undefined) {
    emit('execute', item.action, item.payload)
  } else {
    emit('execute', item.action)
  }
  close()
}

function close() {
  query.value = ''
  activeIndex.value = 0
  emit('close')
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      nextTick(() => {
        searchInputRef.value?.focus()
        updateVirtualWindow()
      })
    }
  },
)

watch(flatItems, () => {
  if (activeIndex.value >= flatItems.value.length) {
    activeIndex.value = Math.max(0, flatItems.value.length - 1)
  }
  nextTick(updateVirtualWindow)
})
</script>

<style scoped>
.command-palette-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-command-palette);
  display: grid;
  place-items: start center;
  padding-top: 18vh;
  background: rgba(2, 6, 23, 0.62);
  backdrop-filter: blur(8px);
}

.command-palette {
  display: grid;
  width: min(560px, calc(100vw - 48px));
  max-height: 60vh;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 10%, transparent), transparent 46%),
  color-mix(in srgb, var(--idea-panel) 94%, #020617 6%);
  box-shadow: var(--shadow-dialog), var(--glow-accent);
  overflow: hidden;
}

.palette-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--idea-border);
}

.palette-search-icon {
  flex: 0 0 auto;
  color: var(--idea-text-muted);
}

.palette-search {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #e5edf8;
  font-size: 15px;
  font-family: inherit;
}

.palette-search::placeholder {
  color: #64748b;
}

.palette-input-row kbd {
  flex: 0 0 auto;
  padding: 3px 7px;
  border: 1px solid var(--idea-border);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.66);
  color: #64748b;
  font-size: 11px;
  font-family: inherit;
}

.palette-results {
  position: relative;
  overflow-y: auto;
  max-height: calc(60vh - 60px);
  padding: 6px;
}

.palette-virtual-list {
  position: relative;
}

.palette-virtual-window {
  position: absolute;
  inset: 0 0 auto;
  will-change: transform;
}

.palette-results::-webkit-scrollbar {
  width: 6px;
}

.palette-results::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.22);
  border-radius: 3px;
}

.palette-empty {
  padding: 32px 16px;
  text-align: center;
  color: #64748b;
  font-size: 13px;
}

.palette-group-label {
  padding: 10px 10px 4px;
  color: var(--accent);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: #cbd5e1;
  text-align: left;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.palette-item:hover,
.palette-item.active {
  background: var(--idea-accent-soft);
  color: #f8fafc;
}

.palette-item-icon {
  flex: 0 0 auto;
  color: var(--idea-text-muted);
}

.palette-item:hover .palette-item-icon,
.palette-item.active .palette-item-icon {
  color: var(--accent);
}

.palette-item-text {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
}

.palette-item-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.palette-item-desc {
  color: #64748b;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.palette-item kbd {
  flex: 0 0 auto;
  padding: 2px 6px;
  border: 1px solid var(--idea-border);
  border-radius: 5px;
  background: rgba(15, 23, 42, 0.54);
  color: #64748b;
  font-size: 10px;
  font-family: inherit;
}
</style>
