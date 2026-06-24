<template>
  <div class="session-tabs" role="tablist" aria-label="Session tabs">
    <button
      v-for="session in openSessions"
      :key="session.id"
      :class="['session-tabs__item', {active: session.id === activeSession?.id}]"
      type="button"
      role="tab"
      :aria-selected="session.id === activeSession?.id"
      @click="activateSession(session.id)"
      @contextmenu.prevent="openSessionTabMenu(session.id, $event)"
    >
      <span class="session-tabs__title">{{ session.name }}</span>
      <span class="session-tabs__close" role="button" tabindex="-1" aria-label="Close session" @click.stop="closeSessionTab(session.id)">
        <X :size="13" aria-hidden="true" />
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import {X} from '@lucide/vue'
import {openContextMenu} from '../../../shared/context-menu'
import {useSessionWorkbench} from '../model/useSessionWorkbench'

const {activeSession, openSessions, activateSession, closeSessionTab} = useSessionWorkbench()

function openSessionTabMenu(sessionId: string, event: MouseEvent) {
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'activate', label: 'Activate', run: () => activateSession(sessionId)},
      {id: 'close', label: 'Close Session', danger: true, run: () => closeSessionTab(sessionId)},
    ],
  })
}
</script>
