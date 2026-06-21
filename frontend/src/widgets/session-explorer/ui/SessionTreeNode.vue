<template>
  <article
    :class="['session-node', {active: session.id === sessionState.activeSessionId}]"
    role="treeitem"
    tabindex="0"
    :aria-selected="session.id === sessionState.activeSessionId"
    :title="`${session.name} · ${session.username}@${session.host}:${session.port}`"
    @click="connectSession(session)"
    @keydown.enter.prevent="connectSession(session)"
    @contextmenu.prevent="openSessionMenu"
  >
    <span class="session-node__status" :class="session.status" :title="`Status: ${session.status}`" />
    <div>
      <strong>{{ session.name }}</strong>
      <small>{{ session.username }}@{{ session.host }}:{{ session.port }}</small>
    </div>
    <button type="button" aria-label="Delete session" title="Delete session" @click.stop="confirmDeleteSession(session)">×</button>
  </article>
</template>

<script setup lang="ts">
import {sessionState, type SessionGroup, type SessionHost} from '../../../entities/session'
import {connectSession} from '../../../features/session/connect-session/connectSession'
import {confirmDeleteSession} from '../../../features/session/delete-session/deleteSession'
import {renameSession} from '../../../features/session/edit-session/renameSession'
import {moveSessionToGroup} from '../../../features/session/manage-groups/manageSessionGroups'
import {openContextMenu, type ContextMenuItem} from '../../../shared/context-menu'

const props = defineProps<{groups: SessionGroup[]; session: SessionHost}>()
const emit = defineEmits<{edit: [session: SessionHost]}>()

function openSessionMenu(event: MouseEvent) {
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'connect', label: 'Connect', run: () => connectSession(props.session)},
      {id: 'edit', label: 'Edit', run: () => emit('edit', props.session)},
      {id: 'rename', label: 'Rename', run: () => renameSession(props.session)},
      ...createMoveItems(),
      {id: 'delete', label: 'Delete', danger: true, run: () => confirmDeleteSession(props.session)},
    ],
  })
}

function createMoveItems(): ContextMenuItem[] {
  return props.groups
    .filter((group) => group.id !== props.session.groupId)
    .map((group) => ({id: `move-${group.id}`, label: `Move to ${group.name}`, run: () => { moveSessionToGroup(props.session, group) }}))
}
</script>
