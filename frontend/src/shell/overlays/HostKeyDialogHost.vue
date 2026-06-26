<template>
  <Transition name="overlay-fade">
    <div v-if="hostKeyState.pendingRequest" class="dialog-backdrop">
    <section class="dialog host-key-dialog" role="alertdialog" aria-modal="true" aria-labelledby="host-key-title">
      <header>
        <h2 id="host-key-title">
          {{ hostKeyState.pendingRequest.reason === 'changed' ? 'Host Key Changed' : 'Unknown Host Key' }}
        </h2>
      </header>
      <div class="host-key-content">
        <p class="host-key-warning" :class="{'host-key-warning--danger': hostKeyState.pendingRequest.reason === 'changed'}">
          <template v-if="hostKeyState.pendingRequest.reason === 'changed'">
            The host key for <strong>{{ hostKeyState.pendingRequest.host }}:{{ hostKeyState.pendingRequest.port }}</strong> has changed. This may indicate a man-in-the-middle attack.
          </template>
          <template v-else>
            The authenticity of host <strong>{{ hostKeyState.pendingRequest.host }}:{{ hostKeyState.pendingRequest.port }}</strong> cannot be established.
          </template>
        </p>
        <div class="host-key-fingerprint">
          <span class="host-key-label">Key type:</span>
          <code>{{ hostKeyState.pendingRequest.keyType }}</code>
        </div>
        <div v-if="hostKeyState.pendingRequest.knownFingerprint" class="host-key-fingerprint">
          <span class="host-key-label">Known fingerprint:</span>
          <code class="host-key-value">{{ hostKeyState.pendingRequest.knownFingerprint }}</code>
        </div>
        <div class="host-key-fingerprint">
          <span class="host-key-label">New fingerprint:</span>
          <code class="host-key-value">{{ hostKeyState.pendingRequest.fingerprint }}</code>
        </div>
        <p class="host-key-prompt">
          Are you sure you want to continue connecting?
        </p>
        <p v-if="hostKeyState.pendingRequest.error" class="host-key-error" role="alert">
          {{ hostKeyState.pendingRequest.error }}
        </p>
      </div>
      <footer>
        <button type="button" class="host-key-cancel" :disabled="hostKeyState.pendingRequest.submitting" @click="onReject">
          No
        </button>
        <button type="button" class="host-key-accept" :disabled="hostKeyState.pendingRequest.submitting || hostKeyState.pendingRequest.reason === 'changed'" @click="onAccept">
          {{ hostKeyState.pendingRequest.submitting ? 'Trusting…' : 'Yes, I trust this host' }}
        </button>
      </footer>
    </section>
  </div>
  </Transition>
</template>

<script setup lang="ts">
import {hostKeyState} from '../../entities/security/model/hostKeyState'
import {acceptPendingHostKey, rejectPendingHostKey} from '../../features/session/connect-session/hostKeyActions'

function onAccept() {
  void acceptPendingHostKey()
}

function onReject() {
  void rejectPendingHostKey()
}
</script>

<style scoped>
.host-key-dialog {
  max-width: 480px;
}

.host-key-warning {
  margin-bottom: 12px;
}

.host-key-warning--danger {
  color: var(--color-danger);
  font-weight: 600;
}

.host-key-fingerprint {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 4px;
  font-size: 0.9em;
}

.host-key-label {
  color: var(--color-text-muted);
  min-width: 80px;
}

.host-key-value {
  word-break: break-all;
  font-family: monospace;
}

.host-key-prompt {
  margin-top: 12px;
  font-weight: 500;
}

.host-key-error {
  margin-top: 8px;
  color: var(--color-danger);
  font-size: 0.9em;
}

.host-key-accept {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.host-key-accept:disabled,
.host-key-cancel:disabled {
  cursor: wait;
  opacity: 0.65;
}

.host-key-cancel {
  background: transparent;
  border: 1px solid var(--color-border);
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 8px;
}
</style>
