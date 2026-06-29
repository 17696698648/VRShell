<template>
  <div class="dialog-backdrop" @click.self="emit('close')">
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="session-edit-title">
      <header>
        <h2 id="session-edit-title">Edit session</h2>
      </header>
      <SessionForm :initial-value="initialValue" submit-label="Save session" @submit="handleSubmit" />
      <p v-if="testResult" :class="['dialog__status', testTone]" role="status">{{ testResult }}</p>
      <p v-if="error" class="dialog__error">{{ error }}</p>
      <footer>
        <UiButton variant="secondary" :loading="testing" @click="testConnection">Test connection</UiButton>
        <UiButton variant="secondary" @click="emit('close')">Cancel</UiButton>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import type {SessionHost} from '../../../entities/session'
import type {CreateSessionInput} from '../../../features/session/create-session/createSession'
import {editSession} from '../../../features/session/edit-session/editSession'
import {persistSessionAuth} from '../../../features/session/manage-credentials/sessionCredentials'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'
import {diagnosticApi} from '../../../shared/ipc/ipcFacade'
import {UiButton} from '../../../shared/ui'
import SessionForm from './SessionForm.vue'

const props = defineProps<{session: SessionHost}>()
const emit = defineEmits<{close: []}>()
const error = ref('')
const testing = ref(false)
const testResult = ref('')
const testTone = ref<'success' | 'danger'>('success')

const initialValue = computed<CreateSessionInput>(() => ({
  name: props.session.name,
  host: props.session.host,
  port: props.session.port,
  username: props.session.username,
  auth: props.session.auth ?? {type: 'agent'},
  tags: props.session.tags,
}))

async function testConnection() {
  testing.value = true
  testResult.value = ''
  try {
    const message = await diagnosticApi.testSshConnection(props.session.host, props.session.port, props.session.username)
    testTone.value = 'success'
    testResult.value = message || 'SSH connection test succeeded.'
  } catch (testError) {
    testTone.value = 'danger'
    testResult.value = getErrorMessage(testError)
  } finally {
    testing.value = false
  }
}

async function handleSubmit(input: CreateSessionInput) {
  try {
    const auth = await persistSessionAuth(props.session.id, input.auth)
    editSession(props.session.id, {...input, auth})
    emit('close')
  } catch (editError) {
    error.value = editError instanceof Error ? editError.message : String(editError)
  }
}
</script>
