<template>
  <div
    class="tree-group"
    :data-group-id="group.id"
    :class="{
      collapsed: !expandedGroups[group.id],
      dragging: draggingGroupId === group.id,
      'drag-over-before': dragOverGroupId === group.id && dragOverPosition === 'before',
      'drag-over-after': dragOverGroupId === group.id && dragOverPosition === 'after',
      'drag-over-inside': dragOverGroupId === group.id && dragOverPosition === 'inside',
      'host-drop-target': draggingHostName && dragOverGroupId === group.id && !dragOverHostName,
      locked: group.id === lockedGroupId,
      'drop-invalid': dragInvalidGroupId === group.id,
    }"
  >
    <div
      class="tree-group-header"
      role="button"
      tabindex="0"
      @click="handleGroupClick"
      @keydown.enter.prevent="$emit('toggle-group', group.id)"
      @keydown.space.prevent="$emit('toggle-group', group.id)"
      @contextmenu="$emit('open-menu', $event, 'group', group.id)"
      @pointerdown="startPointerDrag($event, 'group', group.id)"
      @pointermove="updatePointerDrag"
      @pointerup="finishPointerDrag"
      @pointercancel="cancelPointerDrag"
    >
      <span class="tree-chevron">
        <ChevronDown v-if="expandedGroups[group.id]" :size="14"/>
        <ChevronRight v-else :size="14"/>
      </span>
      <span class="folder-icon">
        <FolderOpen v-if="expandedGroups[group.id]" :size="20"/>
        <Folder v-else :size="20"/>
      </span>
      <input
        v-if="editingGroupId === group.id"
        class="tree-name-input"
        :value="group.name"
        autofocus
        @click.stop
        @pointerdown.stop
        @keydown.enter.prevent="finishGroupRename"
        @keydown.esc.prevent="$emit('cancel-group-rename')"
        @blur="finishGroupRename"
      />
      <strong v-else>
        <template v-for="(part, index) in highlightParts(normalizeDisplayText(group.name))" :key="index">
          <mark v-if="part.match">{{ part.text }}</mark>
          <span v-else>{{ part.text }}</span></template>
      </strong>
      <small>{{ countHosts(group) }}</small>
    </div>

    <div v-show="expandedGroups[group.id]" class="tree-children">
      <SessionTreeGroup
        v-for="child in group.children"
        :key="child.id"
        :group="child"
        :expanded-groups="expandedGroups"
        :editing-group-id="editingGroupId"
        :dragging-group-id="draggingGroupId"
        :drag-over-group-id="dragOverGroupId"
        :drag-over-position="dragOverPosition"
        :dragging-host-name="draggingHostName"
        :drag-over-host-name="dragOverHostName"
        :host-drag-over-position="hostDragOverPosition"
        :locked-group-id="lockedGroupId"
        :search-query="searchQuery"
        @toggle-group="$emit('toggle-group', $event)"
        @open-menu="forwardOpenMenu"
        @connect-session="$emit('connect-session', $event)"
        @rename-group="$emit('rename-group', $event)"
        @cancel-group-rename="$emit('cancel-group-rename')"
        @tree-drag="forwardTreeDrag"
      />

      <div
        v-for="host in group.hosts"
        :key="host.name"
        class="tree-host"
        :data-host-name="host.name"
        role="button"
        tabindex="0"
        :class="{
          active: host.active,
          dragging: draggingHostName === host.name,
          'drag-over-before': dragOverHostName === host.name && hostDragOverPosition === 'before',
          'drag-over-after': dragOverHostName === host.name && hostDragOverPosition === 'after',
        }"
        @dblclick="$emit('connect-session', host.name)"
        @keydown.enter.prevent="$emit('connect-session', host.name)"
        @contextmenu="$emit('open-menu', $event, 'session', host.name)"
        @pointerdown="startPointerDrag($event, 'host', host.name)"
        @pointermove="updatePointerDrag"
        @pointerup="finishPointerDrag"
        @pointercancel="cancelPointerDrag"
      >
        <span class="tree-branch"></span>
        <span class="status-dot" :class="host.status" :title="getStatusLabel(host.status)"></span>
        <span class="status-label">{{ getStatusLabel(host.status) }}</span>
        <span class="host-copy">
          <strong><template v-for="(part, index) in highlightParts(host.name)" :key="index"><mark
            v-if="part.match">{{ part.text }}</mark><span v-else>{{ part.text }}</span></template></strong>
        </span>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="dragGhost.visible"
        class="session-tree-drag-ghost"
        :class="`drag-${dragGhost.kind}`"
        :style="{ left: `${dragGhost.x}px`, top: `${dragGhost.y}px` }"
      >
        <span class="drag-ghost-icon">{{ dragGhost.kind === 'group' ? '▿' : '●' }}</span>
        <span class="drag-ghost-copy">
          <strong>{{ dragGhost.label }}</strong>
          <small>{{ dragGhost.hint }}</small>
        </span>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {ChevronDown, ChevronRight, Folder, FolderOpen} from '@lucide/vue'
import {useSessionTreeDrag} from '../composables/useSessionTreeDrag'

export type ContextMenuType = 'group' | 'session'

export type SessionHost = {
  name: string
  user: string
  address: string
  port: number
  authMethod: string
  password: string
  passwordKeyringId?: string
  privateKeyPath?: string
  passphrase?: string
  remark: string
  latency: string
  status: string
  active: boolean
  autoReconnect?: boolean
  idleTimeoutSecs?: number
  hashKnownHosts?: boolean
  identityFile?: string
}

export type SessionGroup = {
  id: string
  name: string
  icon: string
  hosts: SessionHost[]
  children: SessionGroup[]
}

export type GroupDropPosition = 'before' | 'after' | 'inside'
export type HostDropPosition = 'before' | 'after'

export type SessionTreeDragEvent =
  | { type: 'group-drag-start'; groupId: string }
  | { type: 'group-drag-over'; groupId: string; position: GroupDropPosition }
  | { type: 'group-drag-leave'; groupId: string }
  | { type: 'group-drop'; sourceGroupId: string; targetGroupId: string; position: GroupDropPosition }
  | { type: 'group-drag-end' }
  | { type: 'host-drag-start'; hostName: string }
  | { type: 'host-drag-over'; hostName: string; position: HostDropPosition }
  | { type: 'host-drag-leave'; hostName: string }
  | { type: 'host-drop'; sourceHostName: string; targetHostName: string; position: HostDropPosition }
  | { type: 'host-drop-to-group'; sourceHostName: string; groupId: string }
  | { type: 'host-drag-end' }

const props = defineProps<{
  group: SessionGroup
  expandedGroups: Record<string, boolean>
  editingGroupId: string
  draggingGroupId: string
  dragOverGroupId: string
  dragOverPosition: GroupDropPosition | ''
  draggingHostName: string
  dragOverHostName: string
  hostDragOverPosition: HostDropPosition | ''
  lockedGroupId: string
  searchQuery: string
}>()

const emit = defineEmits<{
  (event: 'toggle-group', groupId: string): void
  (event: 'open-menu', mouseEvent: MouseEvent, type: ContextMenuType, targetId: string): void
  (event: 'connect-session', hostName: string): void
  (event: 'rename-group', payload: { groupId: string; name: string }): void
  (event: 'cancel-group-rename'): void
  (event: 'group-drag-start', groupId: string): void
  (event: 'group-drag-over', groupId: string, position: GroupDropPosition): void
  (event: 'group-drag-leave', groupId: string): void
  (event: 'group-drop', sourceGroupId: string, targetGroupId: string, position: GroupDropPosition): void
  (event: 'group-drag-end'): void
  (event: 'host-drag-start', hostName: string): void
  (event: 'host-drag-over', hostName: string, position: HostDropPosition): void
  (event: 'host-drag-leave', hostName: string): void
  (event: 'host-drop', sourceHostName: string, targetHostName: string, position: HostDropPosition): void
  (event: 'host-drop-to-group', sourceHostName: string, groupId: string): void
  (event: 'host-drag-end'): void
  (event: 'tree-drag', payload: SessionTreeDragEvent): void
}>()

const drag = useSessionTreeDrag({
  props,
  emitters: {
    groupDragStart: (groupId) => emitTreeDrag({type: 'group-drag-start', groupId}),
    groupDragOver: (groupId, position) => emitTreeDrag({type: 'group-drag-over', groupId, position}),
    groupDragLeave: (groupId) => emitTreeDrag({type: 'group-drag-leave', groupId}),
    groupDrop: (sourceGroupId, targetGroupId, position) => emitTreeDrag({
      type: 'group-drop',
      sourceGroupId,
      targetGroupId,
      position
    }),
    groupDragEnd: () => emitTreeDrag({type: 'group-drag-end'}),
    hostDragStart: (hostName) => emitTreeDrag({type: 'host-drag-start', hostName}),
    hostDragOver: (hostName, position) => emitTreeDrag({type: 'host-drag-over', hostName, position}),
    hostDragLeave: (hostName) => emitTreeDrag({type: 'host-drag-leave', hostName}),
    hostDrop: (sourceHostName, targetHostName, position) => emitTreeDrag({
      type: 'host-drop',
      sourceHostName,
      targetHostName,
      position
    }),
    hostDropToGroup: (sourceHostName, groupId) => emitTreeDrag({type: 'host-drop-to-group', sourceHostName, groupId}),
    hostDragEnd: () => emitTreeDrag({type: 'host-drag-end'}),
  },
  getGroupLabel: (groupId) => normalizeDisplayText(findGroupById(groupId, props.group)?.name ?? groupId),
})

const dragInvalidGroupId = computed(() => drag.getDragInvalidGroupId())
const dragGhost = drag.dragGhost
const startPointerDrag = drag.startPointerDrag
const updatePointerDrag = drag.updatePointerDrag
const finishPointerDrag = drag.finishPointerDrag
const cancelPointerDrag = drag.cancelPointerDrag

function countHosts(group: SessionGroup): number {
  return group.hosts.length + group.children.reduce((total, child) => total + countHosts(child), 0)
}

function finishGroupRename(event: Event) {
  const name = (event.target as HTMLInputElement).value.trim()
  emit('rename-group', {groupId: props.group.id, name})
}

type HighlightPart = {
  text: string
  match: boolean
}

function normalizeDisplayText(value: string) {
  const replacements: Record<string, string> = {
    'All': 'All',
    'New Group': 'New Group',
  }
  return replacements[value] ?? value
}

function highlightParts(value: string): HighlightPart[] {
  const query = props.searchQuery.trim()
  if (!query) return [{text: value, match: false}]

  const lowerValue = value.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerValue.indexOf(lowerQuery)
  if (index < 0) return [{text: value, match: false}]

  return [
    {text: value.slice(0, index), match: false},
    {text: value.slice(index, index + query.length), match: true},
    {text: value.slice(index + query.length), match: false},
  ].filter((part) => part.text.length > 0)
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    online: 'Online',
    idle: 'Idle',
    error: 'Error',
    connecting: 'Connecting',
  }
  return labels[status] ?? 'Idle'
}

function findGroupById(groupId: string, group: SessionGroup): SessionGroup | null {
  if (group.id === groupId) return group

  for (const child of group.children) {
    const found = findGroupById(groupId, child)
    if (found) return found
  }

  return null
}

function handleGroupClick(event: MouseEvent) {
  if (drag.consumeSuppressNextGroupClick() || drag.isPointerDragStarted()) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  emit('toggle-group', props.group.id)
}

function forwardOpenMenu(mouseEvent: MouseEvent, type: ContextMenuType, targetId: string) {
  emit('open-menu', mouseEvent, type, targetId)
}

function emitTreeDrag(payload: SessionTreeDragEvent) {
  forwardTreeDrag(payload, false)
  emit('tree-drag', payload)
}

function forwardTreeDrag(payload: SessionTreeDragEvent, forwardNested = true) {
  if (forwardNested) {
    emit('tree-drag', payload)
  }

  switch (payload.type) {
    case 'group-drag-start':
      emit('group-drag-start', payload.groupId)
      break
    case 'group-drag-over':
      emit('group-drag-over', payload.groupId, payload.position)
      break
    case 'group-drag-leave':
      emit('group-drag-leave', payload.groupId)
      break
    case 'group-drop':
      emit('group-drop', payload.sourceGroupId, payload.targetGroupId, payload.position)
      break
    case 'group-drag-end':
      emit('group-drag-end')
      break
    case 'host-drag-start':
      emit('host-drag-start', payload.hostName)
      break
    case 'host-drag-over':
      emit('host-drag-over', payload.hostName, payload.position)
      break
    case 'host-drag-leave':
      emit('host-drag-leave', payload.hostName)
      break
    case 'host-drop':
      emit('host-drop', payload.sourceHostName, payload.targetHostName, payload.position)
      break
    case 'host-drop-to-group':
      emit('host-drop-to-group', payload.sourceHostName, payload.groupId)
      break
    case 'host-drag-end':
      emit('host-drag-end')
      break
  }
}

</script>

<style scoped>
.tree-name-input {
  min-width: 0;
  padding: 2px 6px;
  font-size: 12px;
}
</style>
