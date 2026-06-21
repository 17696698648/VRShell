<template>
  <section class="terminal-pane">
    <div v-if="terminal.status !== 'connected'" :class="['terminal-status', `terminal-status--${terminal.status}`]">
      <span>{{ statusMessage }}</span>
      <button v-if="terminal.status === 'failed' || terminal.status === 'disconnected'" type="button" @click="reconnectTerminalTab(terminal)">Reconnect</button>
    </div>
    <div ref="viewportRef" class="terminal-pane__viewport">
      <p v-for="(line, index) in lines" :key="index" :class="{match: isMatch(line), 'match-current': isCurrentMatch(index)}">{{ line }}</p>
      <p><span class="terminal-caret">█</span></p>
    </div>
    <form class="terminal-input" @submit.prevent="submitInput">
      <span>{{ terminal.cwd }}$</span>
      <input v-model="input" :disabled="terminal.status !== 'connected'" placeholder="Type command and press Enter" />
    </form>
  </section>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {getTerminalBuffer, type TerminalTab} from '../../../entities/terminal'
import {reconnectTerminalTab} from '../../../features/terminal/manage-connection/manageTerminalConnection'
import {getTerminalSearchSummary, terminalSearchState} from '../../../features/terminal/search-terminal/searchTerminal'
import {scheduleTerminalResize} from '../../../features/terminal/resize-terminal/resizeTerminal'
import {sendInputToActiveTerminal} from '../../../features/terminal/send-terminal-input/sendTerminalInput'

const props = defineProps<{terminal: TerminalTab}>()
const input = ref('')
const viewportRef = ref<HTMLElement | null>(null)
const lines = computed(() => getTerminalBuffer(props.terminal.id).value)
const searchSummary = computed(() => getTerminalSearchSummary(props.terminal.id))
const statusMessage = computed(() => {
  if (props.terminal.status === 'connecting') return `Connecting to ${props.terminal.title}...`
  if (props.terminal.status === 'failed') return `${props.terminal.title} failed. Reconnect or inspect logs.`
  if (props.terminal.status === 'disconnected') return `${props.terminal.title} is disconnected.`
  return ''
})
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!viewportRef.value || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(([entry]) => {
    scheduleTerminalResize(props.terminal, {width: entry.contentRect.width, height: entry.contentRect.height})
  })
  resizeObserver.observe(viewportRef.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

async function submitInput() {
  const command = input.value.trim()
  input.value = ''
  await sendInputToActiveTerminal(command)
}

function isMatch(line: string) {
  const query = terminalSearchState.query.trim().toLowerCase()
  return terminalSearchState.open && query.length > 0 && line.toLowerCase().includes(query)
}

function isCurrentMatch(lineIndex: number) {
  if (!terminalSearchState.open || searchSummary.value.total === 0) return false
  return searchSummary.value.matches[terminalSearchState.currentMatchIndex]?.index === lineIndex
}
</script>
