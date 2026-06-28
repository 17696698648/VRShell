<template>
  <article
    :class="['session-tree__row', 'session-tree__row--session', 'session-node', `session-node--${session.status}`, {active: session.id === sessionState.activeSessionId, 'is-selected': session.id === sessionState.activeSessionId}]"
    :aria-label="`${session.name}, ${statusLabel}, ${session.username}@${session.host}:${session.port}`"
    :aria-selected="session.id === sessionState.activeSessionId"
    :title="`${session.name} · ${session.username}@${session.host}:${session.port} · ${statusLabel} · Double-click to connect`"
    :data-session-id="session.id"
    @dblclick="connectSession(session)"
    @keydown.enter.prevent="connectSession(session)"
    @keydown.delete.prevent="confirmDeleteSession(session)"
    @keydown.f2.prevent="emit('edit', session)"
    @contextmenu.prevent="openSessionMenu"
  >
    <span class="session-tree__status session-node__status-dot" aria-hidden="true"/>
    <strong class="session-tree__label">{{ session.name }}</strong>
  </article>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {sessionState, type SessionHost} from '../../../entities/session'
import {connectSession} from '../../../features/session/connect-session/connectSession'
import {confirmDeleteSession} from '../../../features/session/delete-session/deleteSession'
import {renameSession} from '../../../features/session/edit-session/renameSession'
import {openContextMenu} from '../../../shared/context-menu'

const props = defineProps<{ session: SessionHost }>()
const emit = defineEmits<{ edit: [session: SessionHost] }>()

const statusLabels: Record<SessionHost['status'], string> = {
  connected: 'Connected',
  connecting: 'Connecting',
  failed: 'Failed',
  idle: 'Idle',
}
const statusLabel = computed(() => statusLabels[props.session.status])

function openSessionMenu(event: MouseEvent) {
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {
        id: 'connect',
        label: props.session.status === 'failed' ? 'Reconnect' : 'Connect',
        disabled: props.session.status === 'connecting',
        run: () => connectSession(props.session)
      },
      {id: 'session-actions', type: 'separator'},
      {id: 'edit', label: 'Edit', run: () => emit('edit', props.session)},
      {id: 'rename', label: 'Rename', run: () => renameSession(props.session)},
      {id: 'danger-actions', type: 'separator'},
      {id: 'delete', label: 'Delete', danger: true, run: () => confirmDeleteSession(props.session)},
    ],
  })
}
</script>
