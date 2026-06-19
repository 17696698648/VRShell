<template>
  <div ref="terminalRoot" :class="['terminal-wrap', `theme-${theme}`, { embedded }]">
    <div v-if="!embedded" class="controls">
      <label>Host: <input v-model="host" placeholder="example.com"/></label>
      <label>Port: <input v-model.number="port" type="number" style="width:80px"/></label>
      <label>User: <input v-model="username" placeholder="root"/></label>
      <label>Password: <input v-model="password" type="password" placeholder="(optional)"/></label>
      <button @click="connect" :disabled="connected">Connect</button>
      <button @click="() => disconnect()" :disabled="!connected">Disconnect</button>
      <span class="status">Status: {{ status }}</span>
      <!-- Theme selector for design variants -->
      <label style="margin-left:12px">Style:
        <select v-model="theme">
          <option value="minimal">Minimal</option>
          <option value="professional">Professional</option>
          <option value="colorful">Colorful</option>
        </select>
      </label>
    </div>

    <div v-if="connectionLog" class="connection-log">
      <span class="connection-log-dot error"></span>
      <span>{{ connectionLog }}</span>
    </div>

    <TerminalSearchBar
      :visible="searchVisible"
      :query="searchQuery"
      @update:query="(value) => { searchQuery = value; doSearch() }"
      @previous="findPrev"
      @next="findNext"
      @close="closeSearch"
    />

    <TerminalInteractionDialog
      :interaction="activeInteraction"
      @accept-host-key="interactionMgr.acceptHostKey()"
      @reject-host-key="interactionMgr.rejectHostKey()"
      @credentials="interactionMgr.provideCredentials"
      @keyboard-answers="interactionMgr.provideKbAnswers"
      @cancel="interactionMgr.cancel()"
    />

    <div ref="termContainer" class="terminal" tabindex="0">
      <TerminalEmptyOverlay
        :visible="Boolean(embedded) && hasAttemptedConnection && !connected && status !== 'connecting'"
        @reconnect="connect"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, computed, onMounted, onBeforeUnmount, watch} from 'vue'
import {Terminal} from '@xterm/xterm'
import {FitAddon} from '@xterm/addon-fit'
import {SearchAddon} from '@xterm/addon-search'
import '@xterm/xterm/css/xterm.css'
import {invoke} from '@tauri-apps/api/core'
import TerminalInteractionDialog from './TerminalInteractionDialog.vue'
import TerminalSearchBar from './terminal/TerminalSearchBar.vue'
import TerminalEmptyOverlay from './terminal/TerminalEmptyOverlay.vue'
import {formatAppError} from '../services/errors'
import {useInteractionManager} from '../composables/interaction/useInteractionManager'
import {base64ToString, uint8ToBase64} from '../composables/terminal/useTerminalEncoding'
import {useTerminalResize} from '../composables/terminal/useTerminalResize'
import {useTerminalSearch} from '../composables/terminal/useTerminalSearch'
import {useTerminalConnectionState} from '../composables/terminal/useTerminalConnectionState'
import {useTerminalInputQueue} from '../composables/terminal/useTerminalInputQueue'
import {isCurrentTerminalMessage, normalizeTerminalMessage} from '../composables/terminal/terminalMessages'
import {useManagedTimeouts} from '../composables/ui/useManagedTimeouts'
import {
  connectSsh,
  disconnectSshSession,
  listenTerminalEvent,
  pollTerminalEvents,
  resizePty,
  sendTerminalInput,
  TERMINAL_EVENTS,
  type TerminalDataPayload,
} from '../services/terminal'

type XtermTheme = Record<string, string>
type TerminalWithSetOptions = Terminal & { setOptions?: (options: { theme?: XtermTheme }) => void }
type ResizeAckPayload = string | number

const termContainer = ref<HTMLElement | null>(null)
const terminalRoot = ref<HTMLElement | null>(null)
let term: Terminal | null = null
let fit: FitAddon | null = null
let searchAddon: SearchAddon | null = null

// --- Search ---
const {
  closeSearch,
  doSearch,
  findNext,
  findPrev,
  openSearch,
  searchInputRef,
  searchQuery,
  searchVisible,
} = useTerminalSearch({
  getSearchAddon: () => searchAddon,
  getTerminal: () => term,
})

// --- Font zoom ---
const terminalFontSize = ref(13)

function zoomIn() {
  terminalFontSize.value = Math.min(24, terminalFontSize.value + 1)
  applyFontSize()
}

function zoomOut() {
  terminalFontSize.value = Math.max(8, terminalFontSize.value - 1)
  applyFontSize()
}

function resetZoom() {
  terminalFontSize.value = 13
  applyFontSize()
}

function applyFontSize() {
  if (term) {
    term.options.fontSize = terminalFontSize.value
  }
  scheduleFitAndResize()
}

function handleTerminalWheel(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    if (e.deltaY < 0) zoomIn()
    else zoomOut()
  }
}

// --- Interaction manager (replaces old host-key prompt flow) ---
const host = ref('localhost')
const port = ref(22)
const username = ref('')
const password = ref('')
const privateKeyPath = ref('')
const passphrase = ref('')
const autoCopySelection = ref(false)
const rightClickPaste = ref(true)
const autoReconnectSetting = ref(false)
const idleTimeoutSecsSetting = ref(0)
const connectionLog = ref('')
let connectionLogTimer: number | null = null
// theme: minimal | professional | colorful
const theme = ref<'minimal' | 'professional' | 'colorful'>('professional')

// props: allow parent to pass initial config and autoConnect
const props = defineProps<{
  initialConfig?: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    privateKeyPath?: string;
    passphrase?: string;
    autoConnect?: boolean;
    autoReconnect?: boolean;
    idleTimeoutSecs?: number;
    hashKnownHosts?: boolean;
  };
  embedded?: boolean;
  broadcastSessionIds?: string[]
}>();
const emit = defineEmits<{
  (e: 'connected', sessionId: string): void
  (e: 'status-change', status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error', error?: string): void
  (e: 'closed'): void
  (e: 'activity'): void
}>()

const terminalConnection = useTerminalConnectionState((nextStatus, error) => emit('status-change', nextStatus, error))
const {sessionId, connected, hasAttemptedConnection, status} = terminalConnection
const interactionMgr = useInteractionManager(sessionId)
const activeInteraction = computed(() => interactionMgr.active.value)
const {setManagedTimeout, clearManagedTimeouts} = useManagedTimeouts()

let unlistenFns: Array<() => void> = []
let pollTimer: number | null = null
let resizeObserver: ResizeObserver | null = null
let pendingTerminalOutput = ''
let terminalOutputFrame: number | null = null
const MAX_PENDING_TERMINAL_OUTPUT = 1024 * 1024
const OUTPUT_TRUNCATED_NOTICE = '\r\n[VRShell] [output truncated: terminal renderer is catching up]\r\n'

const terminalResize = useTerminalResize({
  getSessionId: () => sessionId.value,
  getTerminal: () => term,
  getFitAddon: () => fit,
  sendResize: async (cols, rows) => {
    await resizePty(sessionId.value, cols, rows)
  },
})


const THEME_DEFINITIONS: Record<string, { css: Record<string, string>; xterm: XtermTheme }> = {
  minimal: {
    css: {
      '--bg': '#FFFFFF', '--panel': '#F5F7FA', '--accent': '#2563EB', '--text': '#0F172A', '--terminal-bg': '#F8FAFC'
    },
    xterm: {background: '#F8FAFC', foreground: '#0F172A', cursor: '#2563EB'}
  },
  professional: {
    css: {
      '--bg': '#071018', '--panel': '#0F172A', '--accent': '#2D9CDB', '--text': '#D8EAF2', '--terminal-bg': '#0A0F14'
    },
    xterm: {background: '#0A0F14', foreground: '#D8EAF2', cursor: '#2D9CDB'}
  },
  colorful: {
    css: {
      '--bg': '#081229', '--panel': '#071026', '--accent': '#06B6D4', '--text': '#EDF2F7', '--terminal-bg': '#081229'
    },
    xterm: {background: '#081229', foreground: '#EDF2F7', cursor: '#06B6D4'}
  }
}

function applyThemeToRoot(t: string) {
  const def = THEME_DEFINITIONS[t] || THEME_DEFINITIONS.professional
  const root = terminalRoot.value
  if (root) {
    for (const [k, v] of Object.entries(def.css)) {
      root.style.setProperty(k, String(v))
    }
  }
  // apply to xterm if initialized
  try {
    ;(term as TerminalWithSetOptions | null)?.setOptions?.({theme: def.xterm})
  } catch (e) {
  }
}

function syncXtermWithCssVars() {
  try {
    const cs = getComputedStyle(terminalRoot.value ?? document.documentElement)
    const bg = cs.getPropertyValue('--terminal-bg') || ''
    const fg = cs.getPropertyValue('--text') || ''
    const cursor = cs.getPropertyValue('--accent') || ''
    const themeObj: XtermTheme = {}
    if (bg) themeObj.background = String(bg).trim()
    if (fg) themeObj.foreground = String(fg).trim()
    if (cursor) themeObj.cursor = String(cursor).trim()
    if (term) try {
      ;(term as TerminalWithSetOptions).setOptions?.({theme: themeObj})
    } catch (e) {
    }
  } catch (e) {
  }
}

function writeTerminalLine(message: string) {
  queueTerminalOutput(`\r\n${message}\r\n`)
}

function flushTerminalOutput() {
  terminalOutputFrame = null
  if (!pendingTerminalOutput) return

  const output = pendingTerminalOutput
  pendingTerminalOutput = ''
  term?.write(output)
}

function queueTerminalOutput(output: string) {
  pendingTerminalOutput += output
  if (pendingTerminalOutput.length > MAX_PENDING_TERMINAL_OUTPUT) {
    pendingTerminalOutput = OUTPUT_TRUNCATED_NOTICE + pendingTerminalOutput.slice(-MAX_PENDING_TERMINAL_OUTPUT)
  }
  if (terminalOutputFrame !== null) return

  terminalOutputFrame = window.requestAnimationFrame(flushTerminalOutput)
}

function clearTerminalOutputQueue() {
  pendingTerminalOutput = ''
  if (terminalOutputFrame !== null) {
    window.cancelAnimationFrame(terminalOutputFrame)
    terminalOutputFrame = null
  }
}

function clearSensitiveAuthFields() {
  password.value = ''
  passphrase.value = ''
}

function logTerminalDebug(context: string, error: unknown) {
  if (import.meta.env.DEV) {
    console.debug(`[VRShell] ${context}`, error)
  }
}

async function sendInputToSession(targetSessionId: string, text: string) {
  const enc = new TextEncoder().encode(text)
  const b64 = uint8ToBase64(enc)
  await sendTerminalInput(targetSessionId, b64)
}

const {queueTerminalInput, clearInputQueue} = useTerminalInputQueue({
  getSessionId: () => sessionId.value,
  getBroadcastSessionIds: () => props.broadcastSessionIds ?? [],
  sendInput: sendInputToSession,
  onError: (message) => terminalConnection.markError(message),
  onDebug: logTerminalDebug,
})

function showConnectionError(message: string) {
  connectionLog.value = message
  if (connectionLogTimer) window.clearTimeout(connectionLogTimer)
  connectionLogTimer = setManagedTimeout(() => {
    connectionLog.value = ''
    connectionLogTimer = null
  }, 5000)
}

async function handleTerminalErrorPayload(payload: unknown) {
  if (!isCurrentTerminalMessage(payload, sessionId.value)) return

  // If there's an active interaction, the backend is waiting for a response -
  // don't clobber it with a generic error message.
  if (activeInteraction.value) return

  const norm = normalizeTerminalMessage(payload)

  // Legacy host-key errors (non-interactive path) - still handled for backward
  // compatibility (polling mode, SFTP).
  if (norm.code === 'host_key_unknown' || norm.code === 'host_key_mismatch') {
    const msg = norm.code === 'host_key_mismatch'
      ? `Host key changed for ${host.value}:${port.value} - connection aborted`
      : `Unknown host key for ${host.value}:${port.value} - connection aborted`
    terminalConnection.markError(msg)
    showConnectionError(msg)
    writeTerminalLine(`[VRShell] ${msg}`)
    return
  }

  // Cancelled by user via interaction dialog.
  if (norm.code === 'cancelled') {
    terminalConnection.markDisconnected(norm.message)
    writeTerminalLine(`[VRShell] ${norm.message}`)
    return
  }

  const error = `error: ${norm.message}`
  terminalConnection.markError(error)
  showConnectionError(error)
  writeTerminalLine(`[VRShell] ${error}`)
}

async function handleQueuedTerminalEvent(queuedEvent: string) {
  const event = JSON.parse(queuedEvent)
  const payload = event.payload
  if (event.event === 'interaction-required') {
    // Forward to the interaction manager (polling fallback path).
    interactionMgr.active.value = {
      sessionId: payload.session_id,
      request: payload.request,
    }
  } else if (event.event === 'terminal-data') {
    if (payload.session_id !== sessionId.value) return
    const text = base64ToString(payload.data_base64)
    queueTerminalOutput(text)
    emit('activity')
  } else if (event.event === 'terminal-error') {
    await handleTerminalErrorPayload(payload)
  } else if (event.event === 'terminal-info') {
    if (!isCurrentTerminalMessage(payload, sessionId.value)) return
    terminalConnection.setInfo(`${normalizeTerminalMessage(payload).message}`)
  } else if (event.event === 'terminal-closed' && payload === sessionId.value) {
    terminalConnection.markDisconnected()
    emit('closed')
  }
}

async function drainQueuedTerminalEvents() {
  if (!sessionId.value) return false

  const queuedEvents = await pollTerminalEvents(sessionId.value)
  for (const queuedEvent of queuedEvents) {
    try {
      await handleQueuedTerminalEvent(queuedEvent)
    } catch {
    }
  }
  return queuedEvents.length > 0
}

async function watchEarlyTerminalEvents() {
  for (let attempt = 0; attempt < 10 && sessionId.value; attempt++) {
    const hadEvents = await drainQueuedTerminalEvents()
    if (hadEvents && !connected.value) return
    await new Promise((resolve) => window.setTimeout(resolve, 100))
  }
}

function clearPollTimer() {
  if (pollTimer !== null) {
    window.clearTimeout(pollTimer)
    pollTimer = null
  }
}

function startPollingFallback() {
  let idlePollDelay = 250

  const poll = async () => {
    if (pollTimer === null || !sessionId.value) return

    let hadEvents = false
    try {
      const msgs = await pollTerminalEvents(sessionId.value)
      hadEvents = msgs.length > 0
      for (const message of msgs) {
        try {
          await handleQueuedTerminalEvent(message)
        } catch (error) {
          logTerminalDebug('handle polled terminal event failed', error)
        }
      }
    } catch (error) {
      logTerminalDebug('poll terminal events failed', error)
    }

    idlePollDelay = hadEvents ? 100 : Math.min(idlePollDelay + 250, 2000)
    pollTimer = window.setTimeout(() => {
      void poll()
    }, idlePollDelay)
  }

  clearPollTimer()
  pollTimer = window.setTimeout(() => {
    void poll()
  }, 100)
}

async function connect() {
  terminalConnection.markConnecting()
  // Start the interaction listener BEFORE invoking connect_ssh to avoid a
  // race where the backend sends interaction-required before we're listening.
  await interactionMgr.startListening()
  writeTerminalLine(`[VRShell] Connecting to ${username.value}@${host.value}:${port.value} ...`)
  try {
    const nextSessionId = await connectSsh({
      host: host.value,
      port: port.value,
      username: username.value,
      password: password.value ? password.value : null,
      privateKeyPath: privateKeyPath.value ? privateKeyPath.value : null,
      passphrase: passphrase.value ? passphrase.value : null,
      autoReconnect: autoReconnectSetting.value,
      idleTimeoutSecs: idleTimeoutSecsSetting.value,
    })
    terminalConnection.markConnected(nextSessionId)
    clearSensitiveAuthFields()
    terminalResize.resetLastSize()
    connectionLog.value = ''
    writeTerminalLine('[VRShell] SSH session connected.')
    if (sessionId.value) emit('connected', sessionId.value)

    // send initial resize for the newly created session
    try {
      await sendResize()
    } catch (error) {
      logTerminalDebug('send initial resize failed', error)
    }

    // Try to set up event listeners. If permission denied for event.listen,
    // fall back to polling via the `poll_events` invoke command.
    try {
      const l1 = await listenTerminalEvent<TerminalDataPayload>(TERMINAL_EVENTS.data, (e) => {
        const payload = e.payload
        if (payload.session_id !== sessionId.value) return
        const s = base64ToString(payload.data_base64)
        queueTerminalOutput(s)
        emit('activity')
      })
      const l2 = await listenTerminalEvent(TERMINAL_EVENTS.error, async (e) => {
        await handleTerminalErrorPayload(e.payload)
      })
      const l3 = await listenTerminalEvent(TERMINAL_EVENTS.info, (e) => {
        if (!isCurrentTerminalMessage(e.payload, sessionId.value)) return
        const msg = normalizeTerminalMessage(e.payload).message
        terminalConnection.setInfo(`${msg}`)
      })
      const l4 = await listenTerminalEvent<string>(TERMINAL_EVENTS.closed, (e) => {
        const sidClosed = e.payload
        if (sidClosed === sessionId.value) {
          terminalConnection.markDisconnected()
          emit('closed')
        }
      })
      const l5 = await listenTerminalEvent<ResizeAckPayload>(TERMINAL_EVENTS.ptyResizeAck, (e) => {
        const payload = e.payload
        if (sessionId.value && String(payload).startsWith(sessionId.value)) {
          terminalConnection.setInfo(`resized: ${String(payload)}`)
        }
      })
      unlistenFns.push(l1, l2, l3, l4)
      unlistenFns.push(l5)
      void watchEarlyTerminalEvents()
    } catch (e: unknown) {
      // Permission denied for event.listen (or similar); enable polling fallback
      terminalConnection.setInfo('connected (polling mode)')
      startPollingFallback()
    }
  } catch (err: unknown) {
    const error = `connect error: ${formatAppError(err, 'SSH connection failed')}`
    terminalConnection.markError(error)
    showConnectionError(error)
    writeTerminalLine(`[VRShell] ${error}`)
    clearSensitiveAuthFields()
  }
}

async function reconnect() {
  terminalConnection.markReconnecting()
  await disconnect(false)
  await connect()
}

async function disconnect(updateStatus = true) {
  if (sessionId.value) {
    try {
      await disconnectSshSession(sessionId.value)
    } catch (e) {
      // ignore
    }
  }
  // cleanup
  terminalConnection.markDisconnected()
  interactionMgr.clear()        // clear any active interaction
  interactionMgr.stopListening() // stop the interaction listener
  if (updateStatus) {
    terminalConnection.setStatus('disconnected')
  }
  // unlisten
  for (const u of unlistenFns) {
    try {
      u()
    } catch {
    }
  }
  unlistenFns = []
  // stop polling if enabled
  clearPollTimer()
  if (connectionLogTimer) {
    window.clearTimeout(connectionLogTimer);
  connectionLogTimer = null
  }
}

onMounted(() => {
  term = new Terminal({convertEol: true, fontSize: terminalFontSize.value, allowProposedApi: true})
  fit = new FitAddon()
  searchAddon = new SearchAddon()
  term.loadAddon(fit)
  term.loadAddon(searchAddon)
  term.open(termContainer.value!)
  writeTerminalLine('[VRShell] Terminal initialized.')
  term.focus()
  scheduleFitAndResize()
  setManagedTimeout(() => writeTerminalLine('[VRShell] Waiting for connection...'), 80)
  resizeObserver = new ResizeObserver(() => scheduleFitAndResize())
  if (termContainer.value) {
    resizeObserver.observe(termContainer.value)
    termContainer.value.addEventListener('wheel', handleTerminalWheel, {passive: false})
  }

  // Search: Ctrl+Shift+F to open, Esc handled by search bar
  term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
      e.preventDefault()
      openSearch()
      return false
    }
    // Font zoom: Ctrl + / Ctrl -
    if ((e.ctrlKey || e.metaKey) && e.key === '=') {
      e.preventDefault()
      zoomIn()
      return false
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      e.preventDefault()
      zoomOut()
      return false
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault()
      resetZoom()
      return false
    }
    return true
  })

  term.onData(async (data) => {
    queueTerminalInput(data)
  })

  window.addEventListener('resize', scheduleFitAndResize)

  // Auto-copy is opt-in to avoid accidentally copying secrets from terminal output.
  term.onSelectionChange(() => {
    if (!autoCopySelection.value) return
    const selected = term?.getSelection()
    if (selected) {
      navigator.clipboard?.writeText(selected).catch((error) => {
        logTerminalDebug('auto-copy selection failed', error)
      })
    }
  })

  // Right-click paste from clipboard can be disabled by settings later.
  termContainer.value?.addEventListener('contextmenu', async (e) => {
    if (!rightClickPaste.value) return
    e.preventDefault()
    try {
      const text = await navigator.clipboard.readText()
      if (text && sessionId.value) {
        queueTerminalInput(text)
      }
    } catch (error) {
      logTerminalDebug('right-click paste failed', error)
    }
  })

  // apply initial theme
  setManagedTimeout(() => {
    applyThemeToRoot(theme.value);
    syncXtermWithCssVars()
  }, 20)

  // apply initialConfig if provided
  if (props.initialConfig) {
    if (props.initialConfig.host) host.value = props.initialConfig.host
    if (props.initialConfig.port) port.value = props.initialConfig.port
    if (props.initialConfig.username) username.value = props.initialConfig.username
    if (props.initialConfig.password) password.value = props.initialConfig.password
    if (props.initialConfig.privateKeyPath) privateKeyPath.value = props.initialConfig.privateKeyPath
    if (props.initialConfig.passphrase) passphrase.value = props.initialConfig.passphrase
    if (props.initialConfig.autoReconnect !== undefined) autoReconnectSetting.value = props.initialConfig.autoReconnect
    if (props.initialConfig.idleTimeoutSecs !== undefined) idleTimeoutSecsSetting.value = props.initialConfig.idleTimeoutSecs
    if (props.initialConfig.hashKnownHosts) {
      invoke('set_hash_known_hosts', { enabled: true })
    }
    if (props.initialConfig.autoConnect) {
      // small delay to let terminal initialize
      setManagedTimeout(() => {
        try {
          connect()
        } catch (error) {
          logTerminalDebug('auto-connect failed', error)
        }
      }, 120)
    }
  }
})

function scheduleFitAndResize() {
  terminalResize.scheduleFitAndResize()
}

async function sendResize() {
  try {
    await terminalResize.sendCurrentSize()
  } catch {
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', scheduleFitAndResize)
  try {
    resizeObserver?.disconnect()
  } catch {
  }
  terminalResize.clearResizeTimer()
  clearTerminalOutputQueue()
  clearManagedTimeouts()
  clearInputQueue()
  disconnect()
  interactionMgr.stopListening()
  if (connectionLogTimer) {
      connectionLogTimer = null
  }
  try {
    term?.dispose()
  } catch {
  }
})

watch(connected, (v) => {
  if (v) {
    setManagedTimeout(() => {
      termContainer.value?.focus()
      term?.focus()
    }, 50)
  }
})

watch(theme, (t) => {
  applyThemeToRoot(t)
})

defineExpose({disconnect, reconnect, scheduleFitAndResize})
</script>

<style scoped>
.terminal-wrap {
  --bg: #071018;
  --panel: #0F172A;
  --accent: #2D9CDB;
  --text: #D8EAF2;
  --terminal-bg: #0A0F14;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  background: var(--bg);
  padding: 12px
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  background: var(--panel);
  padding: 8px;
  border-radius: 6px
}

.controls label {
  font-size: 13px;
  color: var(--text)
}

.controls input, .controls select {
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 6px;
  border-radius: 4px
}

.host-key-prompt-backdrop {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(8px);
}

.host-key-prompt {
  display: grid;
  gap: 12px;
  width: min(520px, 100%);
  padding: 22px;
  border: 1px solid color-mix(in srgb, var(--status-warning, #f59e0b) 42%, var(--idea-border));
  border-radius: 14px;
  background: color-mix(in srgb, var(--idea-panel) 94%, #020617 6%);
  box-shadow: var(--shadow-popover);
  color: var(--idea-text);
}

.host-key-prompt-kicker {
  color: #fbbf24;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.host-key-prompt strong {
  font-size: 18px;
}

.host-key-prompt p,
.host-key-prompt small {
  margin: 0;
  color: var(--idea-text-muted);
  line-height: 1.6;
  white-space: pre-line;
}

.host-key-prompt code {
  overflow-wrap: anywhere;
  padding: 8px 10px;
  border: 1px solid var(--idea-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.8);
  color: #bae6fd;
  font-size: 12px;
}

.host-key-prompt-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.host-key-prompt-actions button {
  padding: 8px 12px;
  border: 1px solid var(--idea-border);
  border-radius: 8px;
  background: transparent;
  color: var(--idea-text-muted);
  font-weight: 800;
}

.host-key-prompt-actions button.trust {
  border-color: color-mix(in srgb, var(--accent) 48%, transparent);
  background: var(--idea-accent);
  color: #fff;
}

/* Auth retry / keyboard-interactive form fields */
.auth-fields {
  display: grid;
  gap: 10px;
}

.auth-fields label {
  display: grid;
  gap: 4px;
  font-size: 13px;
  color: var(--idea-text-muted);
}

.auth-fields label span {
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.auth-fields input {
  padding: 8px 10px;
  border: 1px solid var(--idea-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.8);
  color: var(--idea-text);
  font-size: 13px;
  outline: none;
}

.auth-fields input:focus {
  border-color: color-mix(in srgb, var(--accent) 48%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 18%, transparent);
}

.connection-log {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.82);
  color: #AFC4D8;
  font-size: 12px;
}

.connection-log-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #64748B;
}

.connection-log-dot.connecting {
  background: #FBBF24;
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.45);
}

.connection-log-dot.connected {
  background: #22C55E;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.45);
}

.connection-log-dot.error {
  background: #EF4444;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.45);
}

.terminal {
  position: relative;
  flex: 1;
  min-height: 240px;
  width: 100%;
  background: var(--terminal-bg);
  border-radius: 6px;
  overflow: hidden
}

.terminal-wrap:not(.embedded) .terminal {
  height: 480px;
  flex: none
}

.terminal-wrap.embedded {
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0;
  background: transparent
}

.terminal-wrap.embedded .terminal {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  border-radius: 0
}

.terminal :deep(.xterm),
.terminal :deep(.xterm-viewport),
.terminal :deep(.xterm-screen),
.terminal :deep(.xterm-helpers) {
  width: 100%;
  height: 100%;
}

.terminal :deep(.xterm) {
  overflow: hidden;
}

.terminal :deep(.xterm-viewport) {
  scrollbar-width: none;
}

.terminal :deep(.xterm-viewport::-webkit-scrollbar) {
  width: 0;
  height: 0;
}

.status {
  margin-left: 12px;
  font-weight: 600;
  color: var(--accent)
}

/* --- Search bar --- */
/* Theme presets applied via the .terminal-wrap style attribute (css vars set dynamically) */
.theme-minimal {
}

.theme-professional {
}

.theme-colorful {
}
</style>
