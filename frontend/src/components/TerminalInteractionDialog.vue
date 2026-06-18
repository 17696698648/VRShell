<template>
  <div v-if="interaction" class="host-key-prompt-backdrop">
    <div class="host-key-prompt" role="dialog" aria-modal="true">
      <template v-if="interaction.request.type === 'host_key_verification'">
        <span class="host-key-prompt-kicker">SSH Host Key</span>
        <strong>{{ interaction.request.is_mismatch ? '⚠ Host key changed' : 'Unknown host key' }}</strong>
        <p>
          {{
            interaction.request.is_mismatch
              ? `WARNING: The host key for ${interaction.request.host}:${interaction.request.port} has changed! Possible MITM attack!`
              : `The authenticity of host '${interaction.request.host}:${interaction.request.port}' can't be established.`
          }}
        </p>
        <code>Fingerprint: {{ interaction.request.fingerprint }} ({{ interaction.request.key_type }})</code>
        <small>
          {{
            interaction.request.is_mismatch
              ? 'Only continue if you intentionally changed or reinstalled this server and verified the fingerprint.'
              : 'Only trust this host if the fingerprint matches the server you expect.'
          }}
        </small>
        <div class="host-key-prompt-actions">
          <button @click="$emit('reject-host-key')">Cancel</button>
          <button class="trust" @click="$emit('accept-host-key')">Trust and save</button>
        </div>
      </template>

      <template v-else-if="interaction.request.type === 'authentication_needed'">
        <span class="host-key-prompt-kicker">Authentication Failed</span>
        <strong>Login to {{ interaction.request.host }}</strong>
        <p>
          Authentication as <em>{{ interaction.request.username }}</em> failed.
          <span v-if="interaction.request.error_hint">Server: {{ interaction.request.error_hint }}</span>
        </p>
        <small>Tried: {{ interaction.request.tried_methods.join(', ') }}</small>
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
          <button @click="$emit('cancel')">Cancel</button>
          <button class="trust" @click="submitCredentials">Retry</button>
        </div>
      </template>

      <template v-else-if="interaction.request.type === 'keyboard_interactive'">
        <span class="host-key-prompt-kicker">Verification Required</span>
        <strong>{{ interaction.request.name || 'Keyboard-Interactive' }}</strong>
        <p v-if="interaction.request.instruction">{{ interaction.request.instruction }}</p>
        <div class="auth-fields">
          <label v-for="(prompt, idx) in interaction.request.prompts" :key="idx">
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
          <button @click="$emit('cancel')">Cancel</button>
          <button class="trust" @click="submitKbAnswers">Submit</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, watch} from 'vue'
import type {ActiveInteraction} from '../composables/useInteractionManager'

const props = defineProps<{
  interaction: ActiveInteraction | null
}>()

const emit = defineEmits<{
  (event: 'accept-host-key'): void
  (event: 'reject-host-key'): void
  (event: 'credentials', password?: string, privateKeyPath?: string, passphrase?: string): void
  (event: 'keyboard-answers', answers: string[]): void
  (event: 'cancel'): void
}>()

const authForm = ref({ password: '', privateKeyPath: '', passphrase: '' })
const kbAnswers = ref<string[]>([])

function submitCredentials() {
  emit(
    'credentials',
    authForm.value.password || undefined,
    authForm.value.privateKeyPath || undefined,
    authForm.value.passphrase || undefined,
  )
  authForm.value = { password: '', privateKeyPath: '', passphrase: '' }
}

function submitKbAnswers() {
  emit('keyboard-answers', [...kbAnswers.value])
  kbAnswers.value = []
}

watch(() => props.interaction, (interaction) => {
  if (interaction?.request.type === 'keyboard_interactive') {
    kbAnswers.value = interaction.request.prompts.map(() => '')
  } else if (interaction?.request.type === 'authentication_needed') {
    authForm.value = { password: '', privateKeyPath: '', passphrase: '' }
  }
})
</script>

<style scoped>
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
  background: var(--idea-panel-muted);
  color: var(--idea-text);
}

.host-key-prompt-actions .trust {
  border-color: color-mix(in srgb, var(--status-success, #22c55e) 60%, var(--idea-border));
  background: rgba(34, 197, 94, 0.16);
  color: #bbf7d0;
}

.auth-fields {
  display: grid;
  gap: 10px;
}

.auth-fields label {
  display: grid;
  gap: 5px;
  color: var(--idea-text-muted);
  font-size: 12px;
}

.auth-fields input {
  padding: 8px 10px;
  border: 1px solid var(--idea-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.85);
  color: var(--idea-text);
}
</style>
