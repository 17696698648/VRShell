<template>
  <section class="settings-section ssh-settings-section">
    <div>
      <h3>SSH</h3>
      <p>Connection diagnostics, host-key trust, and authentication defaults for remote sessions.</p>
    </div>

    <div class="settings-field ssh-settings-section__diagnostics">
      <UiInput v-model="host" label="Host" placeholder="example.com" />
      <UiInput v-model="portText" label="Port" placeholder="22" />
      <UiInput v-model="username" label="Username" placeholder="remote user" />
      <div class="ssh-settings-section__actions">
        <UiButton variant="primary" :disabled="testing || !canTest" @click="testConnection">Test connection</UiButton>
        <UiButton variant="secondary" :disabled="testing || !canMeasureLatency" @click="measureLatency">Measure latency</UiButton>
        <UiButton variant="secondary" :disabled="!diagnosticResult" @click="copyDiagnosticResult">Copy result</UiButton>
        <UiButton variant="secondary" :disabled="!canTest" @click="createSessionFromDiagnostic">Create session</UiButton>
      </div>
      <p v-if="diagnosticResult" :class="['ssh-settings-section__result', diagnosticTone]" role="status">{{ diagnosticResult }}</p>
    </div>

    <div class="settings-field ssh-settings-section__known-hosts">
      <div>
        <strong>Known hosts</strong>
        <p>{{ knownHostsDetail }}</p>
      </div>
      <div class="ssh-settings-section__actions">
        <UiButton variant="secondary" :disabled="knownHostsLoading" @click="loadKnownHostsPath">Show path</UiButton>
        <UiButton variant="secondary" :disabled="knownHostsLoading" @click="openKnownHostsFile">Open file</UiButton>
      </div>
    </div>

    <div class="settings-field">
      <UiSelect model-value="known-hosts" label="Host key policy" disabled description="Unknown hosts require explicit fingerprint review before continuing." :options="hostKeyOptions" />
    </div>
    <div class="settings-field">
      <UiSelect model-value="agent" label="Default authentication" disabled description="Session forms can override this per host." :options="authOptions" />
    </div>
  </section>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {createSession} from '../../../features/session/create-session/createSession'
import {switchPanel} from '../../../features/workspace/switch-panel/switchPanel'
import {diagnosticApi, securityApi} from '../../../shared/ipc/ipcFacade'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'
import {notifyFeedback} from '../../../shared/feedback'
import {UiButton, UiInput, UiSelect, type UiSelectOption} from '../../../shared/ui'

const host = ref('')
const portText = ref('22')
const username = ref('')
const testing = ref(false)
const knownHostsLoading = ref(false)
const knownHostsPath = ref('')
const diagnosticResult = ref('')
const diagnosticTone = ref<'success' | 'danger' | 'info'>('info')

const port = computed(() => Number.parseInt(portText.value.trim(), 10))
const canMeasureLatency = computed(() => Boolean(host.value.trim()) && Number.isInteger(port.value) && port.value > 0)
const canTest = computed(() => canMeasureLatency.value && Boolean(username.value.trim()))
const knownHostsDetail = computed(() => knownHostsPath.value || 'Uses your local SSH known_hosts file to verify server identities.')
const diagnosticSummary = computed(() => [
  `Host: ${host.value.trim() || '-'}`,
  `Port: ${Number.isInteger(port.value) ? port.value : '-'}`,
  `Username: ${username.value.trim() || '-'}`,
  `Result: ${diagnosticResult.value || '-'}`,
].join('\n'))

const hostKeyOptions: UiSelectOption[] = [
  {label: 'Verify with known_hosts and ask for unknown hosts', value: 'known-hosts'},
]
const authOptions: UiSelectOption[] = [
  {label: 'SSH agent when available', value: 'agent'},
  {label: 'Password per session', value: 'password'},
  {label: 'Private key per session', value: 'private-key'},
]

async function testConnection() {
  await runDiagnostic(async () => {
    const message = await diagnosticApi.testSshConnection(host.value.trim(), port.value, username.value.trim())
    diagnosticTone.value = 'success'
    diagnosticResult.value = message || 'SSH connection test succeeded.'
  })
}

async function measureLatency() {
  await runDiagnostic(async () => {
    const latency = await diagnosticApi.tcpLatency(host.value.trim(), port.value, 3000)
    diagnosticTone.value = 'success'
    diagnosticResult.value = `TCP latency: ${Math.round(latency)} ms`
  })
}

async function runDiagnostic(run: () => Promise<void>) {
  testing.value = true
  diagnosticTone.value = 'info'
  diagnosticResult.value = 'Running diagnostic...'
  try {
    await run()
  } catch (error) {
    diagnosticTone.value = 'danger'
    diagnosticResult.value = getErrorMessage(error)
  } finally {
    testing.value = false
  }
}

async function copyDiagnosticResult() {
  if (!diagnosticResult.value) return
  try {
    await navigator.clipboard?.writeText(diagnosticSummary.value)
    notifyFeedback({level: 'success', title: 'Copied SSH diagnostic', detail: `${username.value.trim()}@${host.value.trim()}:${port.value}`})
  } catch (error) {
    notifyFeedback({level: 'error', title: 'Unable to copy diagnostic', detail: getErrorMessage(error)})
  }
}

function createSessionFromDiagnostic() {
  try {
    const session = createSession({
      name: host.value.trim(),
      host: host.value.trim(),
      port: port.value,
      username: username.value.trim(),
      auth: {type: 'agent'},
    })
    switchPanel('sessions')
    notifyFeedback({level: 'success', title: 'SSH session created', detail: `${session.username}@${session.host}:${session.port}`})
  } catch (error) {
    notifyFeedback({level: 'error', title: 'Unable to create SSH session', detail: getErrorMessage(error)})
  }
}

async function loadKnownHostsPath() {
  knownHostsLoading.value = true
  try {
    knownHostsPath.value = await securityApi.knownHostsPath()
  } catch (error) {
    notifyFeedback({level: 'error', title: 'Unable to read known_hosts path', detail: getErrorMessage(error)})
  } finally {
    knownHostsLoading.value = false
  }
}

async function openKnownHostsFile() {
  knownHostsLoading.value = true
  try {
    knownHostsPath.value = await securityApi.openKnownHosts()
    notifyFeedback({level: 'success', title: 'Opened known_hosts', detail: knownHostsPath.value})
  } catch (error) {
    notifyFeedback({level: 'error', title: 'Unable to open known_hosts', detail: getErrorMessage(error)})
  } finally {
    knownHostsLoading.value = false
  }
}
</script>
