<template>
  <div class="session-tabs" role="tablist" aria-label="Session tabs">
    <button
      v-for="session in openSessions"
      :key="session.id"
      :class="['session-tabs__item', {active: session.id === activeSession?.id}]"
      type="button"
      role="tab"
      draggable="true"
      :aria-selected="session.id === activeSession?.id"
      @click="activateSession(session.id)"
      @dblclick.prevent="closeSessionTab(session.id)"
      @auxclick="handleAuxClick($event, session.id)"
      @contextmenu.prevent="openSessionTabMenu(session.id, $event)"
      @dragstart="draggedId = session.id"
      @dragover.prevent
      @drop="handleDrop(session.id)"
    >
      <span
        v-if="getSessionStatus(session.id) !== 'none'"
        :class="['session-tabs__status-dot', `session-tabs__status-dot--${getSessionStatus(session.id)}`]"
        aria-hidden="true"
      />
      <span class="session-tabs__title">{{ session.name }}</span>
      <span class="session-tabs__close" role="button" tabindex="-1" aria-label="Close session" @click.stop="closeSessionTab(session.id)">
        <X :size="13" aria-hidden="true" />
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import {X} from '@lucide/vue'
import {computed} from 'vue'
import {openContextMenu} from '../../../shared/context-menu'
import {useSessionWorkbench} from '../model/useSessionWorkbench'

const {activeSession, openSessions, activateSession, closeSessionTab} = useSessionWorkbench()
import {terminalState} from '../../../entities/terminal'
import {ref} from 'vue'

const draggedId = ref<string | null>(null)

type SessionStatus = 'connected' | 'connecting' | 'failed' | 'none'

const sessionStatusMap = computed(() => {
  const map = new Map<string, SessionStatus>()
  for (const session of openSessions.value) {
    map.set(session.id, computeSessionStatus(session.id))
  }
  return map
})

function computeSessionStatus(sessionId: string): SessionStatus {
  const sessionTerminals = terminalState.tabs.filter((tab) => tab.sessionId === sessionId)
  if (sessionTerminals.length === 0) return 'none'
  if (sessionTerminals.some((tab) => tab.status === 'failed')) return 'failed'
  if (sessionTerminals.some((tab) => tab.status === 'connecting')) return 'connecting'
  if (sessionTerminals.every((tab) => tab.status === 'connected')) return 'connected'
  return 'none'
}

function getSessionStatus(sessionId: string): SessionStatus {
  return sessionStatusMap.value.get(sessionId) ?? 'none'
}

function handleDrop(targetId: string) {
  if (draggedId.value && draggedId.value !== targetId) {
    // Reorder sessions by swapping positions
    const sourceIdx = openSessions.value.findIndex((s) => s.id === draggedId.value)
    const targetIdx = openSessions.value.findIndex((s) => s.id === targetId)
    if (sourceIdx >= 0 && targetIdx >= 0) {
      // For now, just activate the dropped session since session order is determined by terminal tabs
      activateSession(draggedId.value)
    }
  }
  draggedId.value = null
}

function handleAuxClick(event: MouseEvent, sessionId: string) {
  // Middle button (button === 1) closes the tab
  if (event.button === 1) {
    event.preventDefault()
    closeSessionTab(sessionId)
  }
}

function openSessionTabMenu(sessionId: string, event: MouseEvent) {
  const currentIndex = openSessions.value.findIndex((s) => s.id === sessionId)
  const sessionsToRight = openSessions.value.slice(currentIndex + 1)
  
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'activate', label: 'Activate', run: () => activateSession(sessionId)},
      {id: 'close', label: 'Close Session', danger: true, run: () => closeSessionTab(sessionId)},
      {id: 'close-others', label: 'Close Others', disabled: openSessions.value.length <= 1, run: () => {
        for (const session of openSessions.value) {
          if (session.id !== sessionId) closeSessionTab(session.id)
        }
      }},
      {id: 'close-to-right', label: 'Close to Right', disabled: sessionsToRight.length === 0, run: () => {
        for (const session of sessionsToRight) closeSessionTab(session.id)
      }},
      {id: 'close-all', label: 'Close All', disabled: openSessions.value.length === 0, danger: true, run: () => {
        for (const session of [...openSessions.value]) closeSessionTab(session.id)
      }},
    ],
  })
}
</script>
