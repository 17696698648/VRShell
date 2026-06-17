<template>
  <div :class="['terminal-wrap', `theme-${theme}`, { embedded }]">
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
          <option value="minimal">极简</option>
          <option value="professional">专业</option>
          <option value="colorful">彩色</option>
        </select>
      </label>
    </div>

    <div v-if="connectionLog" class="connection-log">
      <span class="connection-log-dot error"></span>
      <span>{{ connectionLog }}</span>
    </div>

    <div
      v-if="searchVisible"
      class="terminal-search-bar"
      @keydown.escape="closeSearch"
    >
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        placeholder="Find..."
        @input="doSearch"
        @keydown.enter="findNext"
      />
      <button title="Previous match" @click="findPrev">▲</button>
      <button title="Next match" @click="findNext">▼</button>
      <button title="Close" @click="closeSearch">✕</button>
    </div>

    <!-- Interaction dialog: host key, auth retry, keyboard-interactive -->
    <div v-if="activeInteraction" class="host-key-prompt-backdrop">
      <div class="host-key-prompt" role="dialog" aria-modal="true">

        <!-- Host Key Verification -->
        <template v-if="activeInteraction.request.type === 'host_key_verification'">
          <span class="host-key-prompt-kicker">SSH Host Key</span>
          <strong>{{ activeInteraction.request.is_mismatch ? '⚠ Host key changed' : 'Unknown host key' }}</strong>
          <p>
            {{
              activeInteraction.request.is_mismatch
                ? `WARNING: The host key for ${activeInteraction.request.host}:${activeInteraction.request.port} has changed! Possible MITM attack!`
                : `The authenticity of host '${activeInteraction.request.host}:${activeInteraction.request.port}' can't be established.`
            }}
          </p>
          <code>Fingerprint: {{ activeInteraction.request.fingerprint }} ({{ activeInteraction.request.key_type }})</code>
          <small>
            {{
              activeInteraction.request.is_mismatch
                ? 'Only continue if you intentionally changed or reinstalled this server and verified the fingerprint.'
                : 'Only trust this host if the fingerprint matches the server you expect.'
            }}
          </small>
          <div class="host-key-prompt-actions">
            <button @click="interactionMgr.rejectHostKey()">Cancel</button>
            <button class="trust" @click="interactionMgr.acceptHostKey()">Trust and save</button>
          </div>
        </template>

        <!-- Authentication Needed -->
        <template v-else-if="activeInteraction.request.type === 'authentication_needed'">
          <span class="host-key-prompt-kicker">Authentication Failed</span>
          <strong>Login to {{ activeInteraction.request.host }}</strong>
          <p>
            Authentication as <em>{{ activeInteraction.request.username }}</em> failed.
            <span v-if="activeInteraction.request.error_hint">Server: {{ activeInteraction.request.error_hint }}</span>
          </p>
          <small>Tried: {{ activeInteraction.request.tried_methods.join(', ') }}</small>
          <div class="auth-fields">
            <label>
              <span>Password</span>
              <input v-model="authForm.password" type="password" placeholder="Enter password" @keydown.enter="submitCredentials" />
            </label>
            <label>
              <span>Private key path (optional)</span>
              <input v-model="authForm.privateKeyPath" type="text" placeholder="~/.ssh/id_ed25519" />
            </label>
            <label v-if="authForm.privateKeyPath">
              <span>Passphrase (optional)</span>
              <input v-model="authForm.passphrase" type="password" placeholder="Key passphrase" />
            </label>
          </div>
          <div class="host-key-prompt-actions">
            <button @click="interactionMgr.cancel()">Cancel</button>
            <button class="trust" @click="submitCredentials">Retry</button>
          </div>
        </template>

        <!-- Keyboard-Interactive -->
        <template v-else-if="activeInteraction.request.type === 'keyboard_interactive'">
          <span class="host-key-prompt-kicker">Verification Required</span>
          <strong>{{ activeInteraction.request.name || 'Keyboard-Interactive' }}</strong>
          <p v-if="activeInteraction.request.instruction">{{ activeInteraction.request.instruction }}</p>
          <div class="auth-fields">
            <label v-for="(prompt, idx) in activeInteraction.request.prompts" :key="idx">
              <span>{{ prompt.prompt }}</span>
              <input
                v-model="kbAnswers[idx]"
                :type="prompt.echo ? 'text' : 'password'"
                :placeholder="prompt.echo ? '' : '••••••'"
                @keydown.enter="submitKbAnswers"
              />
            </label>
          </div>
          <div class="host-key-prompt-actions">
            <button @click="interactionMgr.cancel()">Cancel</button>
            <button class="trust" @click="submitKbAnswers">Submit</button>
          </div>
        </template>
      </div>
    </div>

    <div ref="termContainer" class="terminal" tabindex="0">
      <div v-if="embedded && !connected && status !== 'connecting'" class="terminal-empty-overlay">
        <div class="terminal-empty-card">
          <span class="terminal-empty-icon">⌁</span>
          <strong>Terminal is idle</strong>
          <small>Reconnect this terminal when you are ready to continue the SSH session.</small>
          <UiButton title="Reconnect terminal" aria-label="Reconnect terminal" @click.stop="connect">Reconnect
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, computed, onMounted, onBeforeUnmount, watch, defineProps, defineEmits, defineExpose} from 'vue'
import {Terminal} from 'xterm'
import {FitAddon} from 'xterm-addon-fit'
import {SearchAddon} from 'xterm-addon-search'
import 'xterm/css/xterm.css'
import {invoke} from '@tauri-apps/api/core'
import {listen} from '@tauri-apps/api/event'
import UiButton from './ui/UiButton.vue'
import {formatAppError} from '../services/errors'
import {useInteractionManager} from '../composables/useInteractionManager'

const termContainer = ref<HTMLElement | null>(null)
let term: Terminal | null = null
let fit: FitAddon | null = null
let searchAddon: SearchAddon | null = null

// --- Search ---
const searchVisible = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

function openSearch() {
  searchVisible.value = true
  setTimeout(() => {
    searchInputRef.value?.focus()
    searchInputRef.value?.select()
  }, 50)
}

function closeSearch() {
  searchVisible.value = false
  searchQuery.value = ''
  term?.focus()
}

function doSearch() {
  if (!searchAddon || !searchQuery.value) return
  searchAddon.findNext(searchQuery.value, {incremental: true})
}

function findNext() {
  if (!searchAddon || !searchQuery.value) return
  searchAddon.findNext(searchQuery.value)
}

function findPrev() {
  if (!searchAddon || !searchQuery.value) return
  searchAddon.findPrevious(searchQuery.value)
}

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
  term?.options && ((term.options as any).fontSize = terminalFontSize.value)
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
const interactionMgr = useInteractionManager()
const activeInteraction = computed(() => interactionMgr.active.value)
// Auth retry form fields
const authForm = ref({ password: '', privateKeyPath: '', passphrase: '' })
// Keyboard-interactive answer array
const kbAnswers = ref<string[]>([])

function submitCredentials() {
  interactionMgr.provideCredentials(
    authForm.value.password || undefined,
    authForm.value.privateKeyPath || undefined,
    authForm.value.passphrase || undefined,
  )
  authForm.value = { password: '', privateKeyPath: '', passphrase: '' }
}

function submitKbAnswers() {
  interactionMgr.provideKbAnswers([...kbAnswers.value])
  kbAnswers.value = []
}

// Watch for keyboard-interactive prompts to init the answers array.
watch(activeInteraction, (val) => {
  if (val?.request.type === 'keyboard_interactive') {
    kbAnswers.value = val.request.prompts.map(() => '')
  } else if (val?.request.type === 'authentication_needed') {
    authForm.value = { password: '', privateKeyPath: '', passphrase: '' }
  }
})

// --- Connection retry ---
const CONNECT_MAX_RETRIES = 3
let connectRetryCount = 0

const host = ref('localhost')
const port = ref(22)
const username = ref('')
const password = ref('')
const privateKeyPath = ref('')
const passphrase = ref('')
const autoReconnectSetting = ref(false)
const idleTimeoutSecsSetting = ref(0)
const sessionId = ref<string | null>(null)
const connected = ref(false)
const status = ref('idle')
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

let unlistenFns: Array<() => void> = []
let pollInterval: number | null = null
let usePolling = false
let resizeObserver: ResizeObserver | null = null
let fitAndResizeTimer: number | null = null


function uint8ToBase64(u8: Uint8Array) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < u8.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + chunk)))
  }
  return btoa(binary)
}

function base64ToString(b64: string) {
  const bin = atob(b64)
  // convert binary string to utf-8 string
  try {
    // most data from SSH is utf-8-compatible
    return decodeURIComponent(escape(bin))
  } catch (e) {
    return bin
  }
}

const THEME_DEFINITIONS: Record<string, any> = {
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
  // apply CSS variables to the component root via style on document for preview and exported HTML
  if (typeof document !== 'undefined') {
    const root = document.querySelector('.terminal-wrap')
    if (root) {
      for (const [k, v] of Object.entries(def.css)) {
        (root as HTMLElement).style.setProperty(k, String(v))
      }
    }
  }
  // apply to xterm if initialized
  try {
    if (term && def.xterm) {
      // use setOptions but cast to any to satisfy TS across xterm versions
      ;(term as any).setOptions({theme: def.xterm})
    }
  } catch (e) {
  }
}

function syncXtermWithCssVars() {
  try {
    const cs = getComputedStyle(document.documentElement)
    const bg = cs.getPropertyValue('--terminal-bg') || ''
    const fg = cs.getPropertyValue('--text') || ''
    const cursor = cs.getPropertyValue('--accent') || ''
    const themeObj: any = {}
    if (bg) themeObj.background = String(bg).trim()
    if (fg) themeObj.foreground = String(fg).trim()
    if (cursor) themeObj.cursor = String(cursor).trim()
    if (term) try {
      (term as any).setOptions({theme: themeObj})
    } catch (e) {
    }
  } catch (e) {
  }
}

function writeTerminalLine(message: string) {
  term?.writeln(`\r\n${message}`)
}

function showConnectionError(message: string) {
  connectionLog.value = message
  if (connectionLogTimer) window.clearTimeout(connectionLogTimer)
  connectionLogTimer = window.setTimeout(() => {
    connectionLog.value = ''
    connectionLogTimer = null
  }, 5000)
}

function normalizeTerminalMessage(payload: unknown) {
  if (payload && typeof payload === 'object') {
    const value = payload as {
      session_id?: string;
      sessionId?: string;
      message?: string;
      code?: string;
      hostKeyFingerprint?: string
    }
    return {
      sessionId: value.session_id ?? value.sessionId ?? '',
      message: value.message ?? String(payload),
      code: value.code,
      hostKeyFingerprint: value.hostKeyFingerprint,
    }
  }

  return {sessionId: '', message: String(payload)}
}

function isCurrentTerminalMessage(payload: unknown) {
  const message = normalizeTerminalMessage(payload)
  return !message.sessionId || message.sessionId === sessionId.value
}

function setTerminalStatus(nextStatus: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error', error = '') {
  status.value = error || nextStatus
  emit('status-change', nextStatus, error)
}

async function handleTerminalErrorPayload(payload: unknown) {
  if (!isCurrentTerminalMessage(payload)) return

  // If there's an active interaction, the backend is waiting for a response —
  // don't clobber it with a generic error message.
  if (activeInteraction.value) return

  const norm = normalizeTerminalMessage(payload)

  // Legacy host-key errors (non-interactive path) — still handled for backward
  // compatibility (polling mode, SFTP).
  if (norm.code === 'host_key_unknown' || norm.code === 'host_key_mismatch') {
    const msg = norm.code === 'host_key_mismatch'
      ? `Host key changed for ${host.value}:${port.value} — connection aborted`
      : `Unknown host key for ${host.value}:${port.value} — connection aborted`
    setTerminalStatus('error', msg)
    showConnectionError(msg)
    writeTerminalLine(`[VRShell] ${msg}`)
    return
  }

  // Cancelled by user via interaction dialog.
  if (norm.code === 'cancelled') {
    setTerminalStatus('disconnected', norm.message)
    writeTerminalLine(`[VRShell] ${norm.message}`)
    return
  }

  const error = `error: ${norm.message}`
  setTerminalStatus('error', error)
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
    term?.write(text)
    emit('activity')
  } else if (event.event === 'terminal-error') {
    await handleTerminalErrorPayload(payload)
  } else if (event.event === 'terminal-info') {
    if (!isCurrentTerminalMessage(payload)) return
    status.value = `${normalizeTerminalMessage(payload).message}`
  } else if (event.event === 'terminal-closed' && payload === sessionId.value) {
    setTerminalStatus('disconnected')
    connected.value = false
    sessionId.value = null
    emit('closed')
  }
}

async function drainQueuedTerminalEvents() {
  if (!sessionId.value) return false

  const queuedEvents: string[] = await invoke('poll_events', {sessionId: sessionId.value})
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

async function connect() {
  setTerminalStatus('connecting')
  // Start the interaction listener BEFORE invoking connect_ssh to avoid a
  // race where the backend sends interaction-required before we're listening.
  await interactionMgr.startListening()
  writeTerminalLine(`[VRShell] Connecting to ${username.value}@${host.value}:${port.value} ...`)
  try {
    sessionId.value = await invoke<string>('connect_ssh', {
      host: host.value,
      port: port.value,
      username: username.value,
      password: password.value ? password.value : null,
      privateKeyPath: privateKeyPath.value ? privateKeyPath.value : null,
      passphrase: passphrase.value ? passphrase.value : null,
      autoReconnect: autoReconnectSetting.value,
      idleTimeoutSecs: idleTimeoutSecsSetting.value,
    })
    connected.value = true
    connectRetryCount = 0
    setTerminalStatus('connected')
    connectionLog.value = ''
    writeTerminalLine('[VRShell] SSH session connected.')
    if (sessionId.value) emit('connected', sessionId.value)

    // send initial resize for the newly created session
    try {
      await sendResize()
    } catch {
    }

    // Try to set up event listeners. If permission denied for event.listen,
    // fall back to polling via the `poll_events` invoke command.
    try {
      const l1 = await listen('terminal-data', (e) => {
        const payload: any = e.payload
        if (payload.session_id !== sessionId.value) return
        const s = base64ToString(payload.data_base64)
        term?.write(s)
        emit('activity')
      })
      const l2 = await listen('terminal-error', async (e) => {
        await handleTerminalErrorPayload(e.payload)
      })
      const l3 = await listen('terminal-info', (e) => {
        if (!isCurrentTerminalMessage(e.payload)) return
        const msg = normalizeTerminalMessage(e.payload).message
        status.value = `${msg}`
      })
      const l4 = await listen('terminal-closed', (e) => {
        const sidClosed: any = e.payload
        if (sidClosed === sessionId.value) {
          setTerminalStatus('disconnected')
          connected.value = false
          sessionId.value = null
          emit('closed')
        }
      })
      const l5 = await listen('terminal-pty-resize-ack', (e) => {
        const payload: any = e.payload
        if (sessionId.value && String(payload).startsWith(sessionId.value)) {
          status.value = `resized: ${String(payload)}`
        }
      })
      unlistenFns.push(l1, l2, l3, l4)
      unlistenFns.push(l5)
      void watchEarlyTerminalEvents()
    } catch (e: any) {
      // Permission denied for event.listen (or similar); enable polling fallback
      usePolling = true
      status.value = 'connected (polling mode)'
      // start polling periodically
      pollInterval = window.setInterval(async () => {
        try {
          if (!sessionId.value) return
          const msgs: string[] = await invoke('poll_events', {sessionId: sessionId.value})
          for (const message of msgs) {
            try {
              await handleQueuedTerminalEvent(message)
            } catch (e2) {
              // ignore parse errors
            }
          }
        } catch (e3) {
          // ignore polling errors for now
        }
      }, 250)
    }
  } catch (err: any) {
    connectRetryCount++
    if (connectRetryCount < CONNECT_MAX_RETRIES) {
      const delay = Math.min(1000 * Math.pow(2, connectRetryCount - 1), 5000)
      writeTerminalLine(`[VRShell] Retry ${connectRetryCount}/${CONNECT_MAX_RETRIES} in ${delay / 1000}s...`)
      setTimeout(() => connect(), delay)
      return
    }
    const error = `connect error: ${formatAppError(err, 'SSH connection failed')}`
    setTerminalStatus('error', error)
    showConnectionError(error)
    writeTerminalLine(`[VRShell] ${error}`)
    connected.value = false
    connectRetryCount = 0
  }
}

async function reconnect() {
  setTerminalStatus('reconnecting')
  await disconnect(false)
  await connect()
}

async function disconnect(updateStatus = true) {
  if (sessionId.value) {
    try {
      await invoke('disconnect_session', {sessionId: sessionId.value})
    } catch (e) {
      // ignore
    }
  }
  // cleanup
  sessionId.value = null
  connected.value = false
  interactionMgr.clear()        // clear any active interaction
  interactionMgr.stopListening() // stop the interaction listener
  if (updateStatus) {
    setTerminalStatus('disconnected')
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
  try {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null
    }
  } catch {
  }
  if (connectionLogTimer) {
    window.clearTimeout(connectionLogTimer);
    connectionLogTimer = null
  }
  usePolling = false
}

onMounted(() => {
  term = new Terminal({convertEol: true, fontSize: terminalFontSize.value, allowProposedApi: true})
  fit = new FitAddon()
  searchAddon = new SearchAddon()
  term.loadAddon(fit)
  term.loadAddon(searchAddon)
  term.open(termContainer.value!)
  term.writeln('[VRShell] Terminal initialized.')
  term.focus()
  scheduleFitAndResize()
  window.setTimeout(() => term?.writeln('[VRShell] Waiting for connection...'), 80)
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
    if (!sessionId.value) return
    const enc = new TextEncoder().encode(data)
    const b64 = uint8ToBase64(enc)
    try {
      await invoke('send_input', {sessionId: sessionId.value, dataBase64: b64})
      // Broadcast to other terminals in the same session
      if (props.broadcastSessionIds && props.broadcastSessionIds.length > 0) {
        for (const sid of props.broadcastSessionIds) {
          invoke('send_input', {sessionId: sid, dataBase64: b64}).catch(() => {
          })
        }
      }
    } catch (e) {
      status.value = `send error: ${e}`
    }
  })

  window.addEventListener('resize', scheduleFitAndResize)

  // Auto-copy selected text to clipboard (like modern terminals)
  term.onSelectionChange(() => {
    const selected = term?.getSelection()
    if (selected) {
      navigator.clipboard?.writeText(selected).catch(() => {
      })
    }
  })

  // Right-click paste from clipboard
  termContainer.value?.addEventListener('contextmenu', async (e) => {
    e.preventDefault()
    try {
      const text = await navigator.clipboard.readText()
      if (text && sessionId.value) {
        const enc = new TextEncoder().encode(text)
        const b64 = uint8ToBase64(enc)
        await invoke('send_input', {sessionId: sessionId.value, dataBase64: b64})
      }
    } catch {
    }
  })

  // apply initial theme
  setTimeout(() => {
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
      setTimeout(() => {
        try {
          connect()
        } catch {
        }
      }, 120)
    }
  }
})

function scheduleFitAndResize() {
  if (fitAndResizeTimer) {
    window.clearTimeout(fitAndResizeTimer)
  }
  fitAndResizeTimer = window.setTimeout(() => {
    fitAndResizeTimer = null
    try {
      fit?.fit()
      term?.refresh(0, term.rows - 1)
      sendResize()
    } catch {
    }
  }, 60)
}

async function sendResize() {
  if (!sessionId.value) return
  try {
    const cols = term?.cols ?? 80
    const rows = term?.rows ?? 24
    await invoke('resize_pty', {sessionId: sessionId.value, cols, rows})
  } catch (e) {
    // ignore
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', scheduleFitAndResize)
  try {
    resizeObserver?.disconnect()
  } catch {
  }
  if (fitAndResizeTimer) {
    window.clearTimeout(fitAndResizeTimer);
    fitAndResizeTimer = null
  }
  disconnect()
  interactionMgr.stopListening()
  if (connectionLogTimer) {
    window.clearTimeout(connectionLogTimer);
    connectionLogTimer = null
  }
  try {
    term?.dispose()
  } catch {
  }
})

watch(connected, (v) => {
  if (v) {
    setTimeout(() => {
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

.terminal-empty-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-items: center;
  pointer-events: none;
  background: radial-gradient(circle at center, rgba(15, 23, 42, 0.52), transparent 58%);
}

.terminal-empty-card {
  display: grid;
  justify-items: center;
  gap: 8px;
  max-width: 320px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.72);
  color: #dbeafe;
  text-align: center;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
  pointer-events: auto;
  backdrop-filter: blur(12px);
}

.terminal-empty-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 14px;
  background: rgba(56, 189, 248, 0.12);
  color: #7dd3fc;
  font-size: 20px;
}

.terminal-empty-card small {
  color: #94a3b8;
  line-height: 1.5;
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
.terminal-search-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.92);
  animation: searchSlideIn 0.16s ease;
}

@keyframes searchSlideIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.terminal-search-bar input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 4px 8px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 4px;
  background: rgba(2, 6, 23, 0.7);
  color: #e2e8f0;
  font-size: 12px;
  outline: none;
}

.terminal-search-bar input:focus {
  border-color: rgba(56, 189, 248, 0.5);
}

.terminal-search-bar .search-count {
  font-size: 11px;
  color: #94a3b8;
  min-width: 32px;
  text-align: center;
}

.terminal-search-bar button {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}

.terminal-search-bar button:hover {
  background: rgba(56, 189, 248, 0.14);
  color: #e2e8f0;
}

/* Theme presets applied via the .terminal-wrap style attribute (css vars set dynamically) */
.theme-minimal {
}

.theme-professional {
}

.theme-colorful {
}
</style>
