<template>
  <section class="drawer-panel" v-show="visible">
    <SessionSearch v-model="searchQuery" />

    <SessionTreePanel
      :session-groups="visibleSessionGroups"
      :search-query="searchQuery"
      :expanded-groups="expandedGroups"
      :editing-group-id="editingGroupId"
      :dragging-group-id="draggingGroupId"
      :drag-over-group-id="dragOverGroupId"
      :drag-over-position="dragOverPosition"
      :dragging-host-name="draggingHostName"
      :drag-over-host-name="dragOverHostName"
      :host-drag-over-position="hostDragOverPosition"
      :locked-group-id="lockedGroupId"
      @create-root-group="emit('create-root-group')"
      @create-session="emit('create-session')"
      @collapse-all-groups="emit('collapse-all-groups')"
      @toggle-group="emit('toggle-group', $event)"
      @open-menu="(event, type, targetId) => emit('open-menu', event, type, targetId)"
      @connect-session="emit('connect-session', $event)"
      @rename-group="emit('rename-group', $event)"
      @cancel-group-rename="emit('cancel-group-rename')"
      @group-drag-start="emit('group-drag-start', $event)"
      @group-drag-over="(groupId, position) => emit('group-drag-over', groupId, position)"
      @group-drag-leave="emit('group-drag-leave', $event)"
      @group-drop="(sourceGroupId, targetGroupId, position) => emit('group-drop', sourceGroupId, targetGroupId, position)"
      @group-drag-end="emit('group-drag-end')"
      @host-drag-start="emit('host-drag-start', $event)"
      @host-drag-over="(hostName, position) => emit('host-drag-over', hostName, position)"
      @host-drag-leave="emit('host-drag-leave', $event)"
      @host-drop="(sourceHostName, targetHostName, position) => emit('host-drop', sourceHostName, targetHostName, position)"
      @host-drop-to-group="(sourceHostName, groupId) => emit('host-drop-to-group', sourceHostName, groupId)"
      @host-drag-end="emit('host-drag-end')"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SessionSearch from './SessionSearch.vue'
import SessionTreePanel from './SessionTreePanel.vue'
import type { ContextMenuType, GroupDropPosition, HostDropPosition, SessionGroup } from './SessionTreeGroup.vue'

const props = defineProps<{
  visible: boolean
  sessionGroups: SessionGroup[]
  expandedGroups: Record<string, boolean>
  editingGroupId: string
  draggingGroupId: string
  dragOverGroupId: string
  dragOverPosition: GroupDropPosition | ''
  draggingHostName: string
  dragOverHostName: string
  hostDragOverPosition: HostDropPosition | ''
  lockedGroupId: string
}>()

const searchQuery = ref('')
const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const visibleSessionGroups = computed(() => {
  if (!normalizedSearchQuery.value) return props.sessionGroups
  return props.sessionGroups.map((group) => filterGroup(group, normalizedSearchQuery.value)).filter(Boolean) as SessionGroup[]
})

function filterGroup(group: SessionGroup, query: string): SessionGroup | null {
  const groupMatches = group.name.toLowerCase().includes(query)
  const hosts = group.hosts.filter((host) => [host.name, host.user, host.address, host.remark].some((value) => value.toLowerCase().includes(query)))
  const children = group.children.map((child) => filterGroup(child, query)).filter(Boolean) as SessionGroup[]

  if (!groupMatches && hosts.length === 0 && children.length === 0) return null
  return { ...group, hosts: groupMatches ? group.hosts : hosts, children: groupMatches ? group.children : children }
}

const emit = defineEmits<{
  (event: 'create-root-group'): void
  (event: 'create-session'): void
  (event: 'collapse-all-groups'): void
  (event: 'toggle-group', groupId: string): void
  (event: 'open-menu', mouseEvent: MouseEvent, type: ContextMenuType, targetId: string): void
  (event: 'connect-session', sessionName: string): void
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
}>()
</script>

<style scoped>
.drawer-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 280px;
  max-width: 100%;
  box-sizing: border-box;
  min-height: 0;
  padding: 8px 8px;
  border-right: 1px solid var(--idea-border);
  overflow: hidden;
  background: var(--idea-panel);
}

</style>
