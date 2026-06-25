<template>
  <div v-if="hostKeyState.pendingRequest" class="dialog-backdrop">
    <section class="dialog host-key-dialog" role="alertdialog" aria-modal="true" aria-labelledby="host-key-title">
      <header>
        <h2 id="host-key-title">Unknown Host Key</h2>
      </header>
      <div class="host-key-content">
        <p class="host-key-warning">
          The authenticity of host <strong>{{ hostKeyState.pendingRequest.host }}:{{ hostKeyState.pendingRequest.port }}</strong> cannot be established.
        </p>
        <div class="host-key-fingerprint">
          <span class="host-key-label">Key type:</span>
          <code>{{ hostKeyState.pendingRequest.keyType }}</code>
        </div>
        <div class="host-key-fingerprint">
          <span class="host-key-label">Fingerprint:</span>
          <code class="host-key-value">{{ hostKeyState.pendingRequest.fingerprint }}</code>
        </div>
        <p class="host-key-prompt">
          Are you sure you want to continue connecting?
        </p>
      </div>
      <footer>
        <button type="button" class="host-key-cancel" @click="onReject">No</button>
        <button type="button" class="host-key-accept" @click="onAccept">Yes, I trust this host</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import {hostKeyState, acceptHostKeyRequest, rejectHostKeyRequest} from '../../entities/security/model/hostKeyState'
import {securityApi} from '../../shared/ipc/ipcFacade'

async function onAccept() {
  const request = hostKeyState.pendingRequest
  if (!request) return

  try {
    await securityApi.acceptHostKey({
      pendingId: request.pendingId,
      ...request.authArgs,
    })
  } catch {
    // Error will be handled by the caller
  }
  acceptHostKeyRequest()
}

async function onReject() {
  const request = hostKeyState.pendingRequest
  if (!request) return

  try {
    await securityApi.rejectHostKey(request.pendingId)
  } catch {
    // Ignore rejection errors
  }
  rejectHostKeyRequest()
}
</script>

<style scoped>
.host-key-dialog {
  max-width: 480px;
}

.host-key-warning {
  margin-bottom: 12px;
}

.host-key-fingerprint {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 4px;
  font-size: 0.9em;
}

.host-key-label {
  color: var(--text-muted, #888);
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

.host-key-accept {
  background: var(--accent, #007acc);
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.host-key-cancel {
  background: transparent;
  border: 1px solid var(--border, #444);
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 8px;
}
</style>
