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
    <strong class="session-tree__label">
      <span v-if="isFavorite" class="session-node__favorite" aria-label="Favorite">★</span>
      {{ session.name }}
    </strong>
    <span v-if="visibleTags.length > 0" class="session-node__tags" aria-label="Session tags">
      <small v-for="tag in visibleTags" :key="tag">{{ tag }}</small>
    </span>
  </article>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {sessionState, type SessionHost} from '../../../entities/session'
import {connectSession} from '../../../features/session/connect-session/connectSession'
import {confirmDeleteSession} from '../../../features/session/delete-session/deleteSession'
import {renameSession} from '../../../features/session/edit-session/renameSession'
import {duplicateSession, favoriteSessionTag, isFavoriteSession, toggleFavoriteSession} from '../../../features/session/edit-session/sessionActions'
import {openContextMenu} from '../../../shared/context-menu'
import {notifyFeedback} from '../../../shared/feedback'

const props = defineProps<{ session: SessionHost }>()
const emit = defineEmits<{ edit: [session: SessionHost] }>()

const statusLabels: Record<SessionHost['status'], string> = {
  connected: 'Connected',
  connecting: 'Connecting',
  failed: 'Failed',
  idle: 'Idle',
}
const statusLabel = computed(() => statusLabels[props.session.status])
const isFavorite = computed(() => isFavoriteSession(props.session))
const visibleTags = computed(() => props.session.tags.filter((tag) => tag !== favoriteSessionTag).slice(0, 2))

function duplicateCurrentSession() {
  const copy = duplicateSession(props.session)
  notifyFeedback({level: 'success', title: 'Session duplicated', detail: copy.name})
}

function toggleFavorite() {
  const next = toggleFavoriteSession(props.session)
  notifyFeedback({level: 'success', title: isFavoriteSession(next) ? 'Added to favorites' : 'Removed from favorites', detail: next.name})
}

async function copySshTarget() {
  const target = `${props.session.username}@${props.session.host}:${props.session.port}`
  await navigator.clipboard?.writeText(target)
  notifyFeedback({level: 'success', title: 'Copied SSH target', detail: target})
}

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
      {id: 'duplicate', label: 'Duplicate', run: duplicateCurrentSession},
      {id: 'favorite', label: isFavorite.value ? 'Remove from favorites' : 'Add to favorites', run: toggleFavorite},
      {id: 'copy-host', label: 'Copy SSH target', run: copySshTarget},
      {id: 'danger-actions', type: 'separator'},
      {id: 'delete', label: 'Delete', danger: true, run: () => confirmDeleteSession(props.session)},
    ],
  })
}
</script>
