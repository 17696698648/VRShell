<template>
  <section class="session-terminal-pane" :class="{'session-terminal-pane--connected': terminal.status === 'connected'}">
    <div v-if="terminal.status !== 'connected'" :class="['session-terminal-status', `session-terminal-status--${terminal.status}`]">
      <span>{{ statusMessage }}</span>
      <button v-if="terminal.status === 'failed' || terminal.status === 'disconnected'" type="button" @click="reconnectTerminalTab(terminal)">Reconnect</button>
    </div>
    <div ref="viewportRef" class="session-terminal-pane__viewport" />
  </section>
</template>

<script setup lang="ts">
import {Terminal} from '@xterm/xterm'
import {FitAddon} from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import type {IDisposable} from '@xterm/xterm'
import {getTerminalBuffer, type TerminalTab} from '../../../entities/terminal'
import {reconnectTerminalTab} from '../../../features/terminal/manage-connection/manageTerminalConnection'
import {scheduleTerminalResize} from '../../../features/terminal/resize-terminal/resizeTerminal'
import {sendTerminalDataToTerminalTab} from '../../../features/terminal/send-terminal-input/sendTerminalInput'

const props = defineProps<{terminal: TerminalTab}>()
const viewportRef = ref<HTMLElement | null>(null)
const lines = computed(() => getTerminalBuffer(props.terminal.id).value)
const statusMessage = computed(() => {
  if (props.terminal.status === 'connecting') return `Connecting to ${props.terminal.title}...`
  if (props.terminal.status === 'failed') return `${props.terminal.title} failed. Reconnect or inspect logs.`
  if (props.terminal.status === 'disconnected') return `${props.terminal.title} is disconnected.`
  return ''
})
let resizeObserver: ResizeObserver | null = null
let xterm: Terminal | null = null
let fitAddon: FitAddon | null = null
let dataDisposable: IDisposable | null = null
let resizeFrame: number | null = null
let scrollFrame: number | null = null
let renderedLineCount = 0

onMounted(() => {
  if (!viewportRef.value) return
  fitAddon = new FitAddon()
  xterm = new Terminal({
    cursorBlink: true,
    convertEol: true,
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    scrollback: 5000,
    theme: {
      background: readCssToken('--color-terminal-bg'),
      foreground: readCssToken('--color-terminal-text'),
      cursor: readCssToken('--color-terminal-cursor'),
    },
  })
  xterm.loadAddon(fitAddon)
  xterm.open(viewportRef.value)
  dataDisposable = xterm.onData((data) => {
    if (props.terminal.status !== 'connected') return
    void sendTerminalDataToTerminalTab(props.terminal, data)
  })
  void nextTick(() => {
    fitAndResize()
    renderNewLines()
  })

  if (typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(([entry]) => {
    if (entry.contentRect.width > 0 && entry.contentRect.height > 0) scheduleFitAndResize()
  })
  resizeObserver.observe(viewportRef.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame)
  resizeFrame = null
  if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame)
  scrollFrame = null
  dataDisposable?.dispose()
  dataDisposable = null
  xterm?.dispose()
  xterm = null
  fitAddon = null
})

watch(lines, renderNewLines)
watch(() => props.terminal.id, resetTerminalViewport)

function renderNewLines() {
  if (!xterm) return
  const newLines = lines.value.slice(renderedLineCount)
  for (const [index, line] of newLines.entries()) {
    const isLastLine = index === newLines.length - 1
    xterm.write(line, isLastLine ? scheduleScrollToBottom : undefined)
  }
  renderedLineCount = lines.value.length
  if (newLines.length === 0) scheduleScrollToBottom()
}

function scheduleScrollToBottom() {
  if (scrollFrame !== null) return
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = null
    xterm?.scrollToBottom()
  })
}

function resetTerminalViewport() {
  renderedLineCount = 0
  xterm?.clear()
  renderNewLines()
  void nextTick(scheduleFitAndResize)
}

function scheduleFitAndResize() {
  if (resizeFrame !== null) return
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = null
    fitAndResize()
  })
}

function fitAndResize() {
  if (!fitAddon || !xterm || !viewportRef.value) return
  if (viewportRef.value.clientWidth === 0 || viewportRef.value.clientHeight === 0) return
  fitAddon.fit()
  scheduleTerminalResize(props.terminal, {cols: xterm.cols, rows: xterm.rows})
}

function readCssToken(name: string) {
  if (typeof window === 'undefined') return ''
  return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
</script>
