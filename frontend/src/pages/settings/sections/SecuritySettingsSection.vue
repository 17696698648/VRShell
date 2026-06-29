<template>
  <section class="settings-section">
    <div><h3>Security</h3><p>High-risk settings should be explicit and auditable.</p></div>
    <p class="settings-warning" role="note">Security changes can affect saved hosts, keyring access, and audit behavior. Review carefully before applying.</p>
    <div class="settings-field security-settings__known-hosts">
      <div>
        <span>Known hosts</span>
        <p>{{ knownHostsDetail }}</p>
      </div>
      <div class="security-settings__actions">
        <UiButton variant="secondary" :disabled="loadingKnownHosts" @click="showKnownHostsPath">Show path</UiButton>
        <UiButton variant="secondary" :disabled="loadingKnownHosts" @click="openKnownHosts">Open file</UiButton>
      </div>
    </div>
    <div class="settings-field"><UiSelect model-value="keyring" label="Credential storage" disabled description="Passwords are stored in the OS keyring when available; private keys stay on disk." :options="credentialOptions" /></div>
    <div class="settings-field"><UiSelect model-value="mask" label="Sensitive values" disabled :options="sensitiveValueOptions" /></div>
  </section>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'
import {notifyFeedback} from '../../../shared/feedback'
import {securityApi} from '../../../shared/ipc/ipcFacade'
import {UiButton, UiSelect, type UiSelectOption} from '../../../shared/ui'

const knownHostsPath = ref('')
const loadingKnownHosts = ref(false)
const knownHostsDetail = computed(() => knownHostsPath.value || 'Host keys are verified against your local known_hosts file before SSH/SFTP connections continue.')

const credentialOptions: UiSelectOption[] = [
  {label: 'Use OS keyring for saved passwords', value: 'keyring'},
]
const sensitiveValueOptions: UiSelectOption[] = [
  {label: 'Mask passwords and passphrases', value: 'mask'},
]

async function showKnownHostsPath() {
  loadingKnownHosts.value = true
  try {
    knownHostsPath.value = await securityApi.knownHostsPath()
  } catch (error) {
    notifyFeedback({level: 'error', title: 'Unable to read known_hosts path', detail: getErrorMessage(error)})
  } finally {
    loadingKnownHosts.value = false
  }
}

async function openKnownHosts() {
  loadingKnownHosts.value = true
  try {
    knownHostsPath.value = await securityApi.openKnownHosts()
    notifyFeedback({level: 'success', title: 'Opened known_hosts', detail: knownHostsPath.value})
  } catch (error) {
    notifyFeedback({level: 'error', title: 'Unable to open known_hosts', detail: getErrorMessage(error)})
  } finally {
    loadingKnownHosts.value = false
  }
}
</script>
