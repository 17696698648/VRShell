<template>
  <section class="session-tree">
    <SessionTreeToolbar
      @create-root-group="emit('create-root-group')"
      @create-session="emit('create-session')"
      @collapse-all-groups="emit('collapse-all-groups')"
    />

    <SessionTreeGroup
      v-for="group in sessionGroups"
      :key="group.id"
      :group="group"
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
import SessionTreeGroup, { type ContextMenuType, type GroupDropPosition, type HostDropPosition, type SessionGroup } from './SessionTreeGroup.vue'
import SessionTreeToolbar from './SessionTreeToolbar.vue'

defineProps<{
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
  searchQuery: string
}>()

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
.session-tree {
  position: relative;
  z-index: 1;
  display: grid;
  flex: 1 1 auto;
  align-content: start;
  gap: 2px;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-top: 4px;
  padding-right: 2px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}
</style>

