import {ref, type Ref, unref} from 'vue'
import {listen} from '@tauri-apps/api/event'
import {invoke} from '@tauri-apps/api/core'

// ---------------------------------------------------------------------------
// Types matching the Rust InteractionRequest / InteractionResponse enums
// ---------------------------------------------------------------------------

export interface KbPrompt {
  prompt: string
  echo: boolean
}

export type InteractionRequest =
  | {
  type: 'host_key_verification'
  host: string
  port: number
  fingerprint: string
  key_type: string
  is_mismatch: boolean
}
  | {
  type: 'authentication_needed'
  host: string
  username: string
  tried_methods: string[]
  available_methods: string[]
  error_hint?: string | null
}
  | {
  type: 'keyboard_interactive'
  name: string
  instruction: string
  prompts: KbPrompt[]
}

export type InteractionResponse =
  | { type: 'host_key_accepted' }
  | { type: 'host_key_rejected' }
  | { type: 'credentials'; password?: string | null; private_key_path?: string | null; passphrase?: string | null }
  | { type: 'keyboard_interactive_answers'; answers: string[] }
  | { type: 'cancel' }

export interface ActiveInteraction {
  sessionId: string
  request: InteractionRequest
}

type InteractionRequiredEvent = {
  payload: {
    session_id: string
    request: InteractionRequest
  }
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * @param sessionIdRef — Ref to the current terminal's SSH session ID.
 *   When set, only `interaction-required` events matching this session are
 *   accepted.  This prevents one TerminalComponent from stealing another's
 *   interaction event when multiple terminal tabs connect simultaneously.
 */
export function useInteractionManager(sessionIdRef: Ref<string | null>) {
  const active = ref<ActiveInteraction | null>(null) as Ref<ActiveInteraction | null>
  let listenUnsubscribe: (() => void) | null = null

  // Start listening for backend interaction requests.
  async function startListening() {
    if (listenUnsubscribe) return // already listening for this instance
    listenUnsubscribe = await listen(
      'interaction-required',
      (event: InteractionRequiredEvent) => {
        const {session_id, request} = event.payload

        // When the terminal's own session ID is already known, only accept
        // events that belong to it.  Otherwise any auto-connecting tab
        // would overwrite every other tab's active interaction.
        const ownSessionId = unref(sessionIdRef)
        if (ownSessionId && ownSessionId !== session_id) return

        active.value = {sessionId: session_id, request}
      },
    )
  }

  // Send a response to the backend and clear the active interaction.
  async function respond(response: InteractionResponse) {
    if (!active.value) return
    const sessionId = active.value.sessionId
    try {
      await invoke('respond_to_interaction', {
        sessionId,
        response: toSnakeCase(response),
      })
    } finally {
      active.value = null
    }
  }

  // Convenience methods.
  async function acceptHostKey() {
    await respond({type: 'host_key_accepted'})
  }

  async function rejectHostKey() {
    await respond({type: 'host_key_rejected'})
  }

  async function provideCredentials(password?: string, keyPath?: string, passphrase?: string) {
    await respond({
      type: 'credentials',
      password: password || null,
      private_key_path: keyPath || null,
      passphrase: passphrase || null,
    })
  }

  async function provideKbAnswers(answers: string[]) {
    await respond({type: 'keyboard_interactive_answers', answers})
  }

  async function cancel() {
    await respond({type: 'cancel'})
  }

  function clear() {
    active.value = null
  }

  // Clean up the listener.
  function stopListening() {
    listenUnsubscribe?.()
    listenUnsubscribe = null
  }

  return {
    active,
    startListening,
    stopListening,
    respond,
    acceptHostKey,
    rejectHostKey,
    provideCredentials,
    provideKbAnswers,
    cancel,
    clear,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert camelCase keys to snake_case for the Rust backend. */
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}
