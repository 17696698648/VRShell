<template>
  <div class="dialog-backdrop" @click.self="emit('close')">
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="session-edit-title">
      <header>
        <h2 id="session-edit-title">Edit session</h2>
      </header>
      <SessionForm :initial-value="initialValue" submit-label="Save session" @submit="handleSubmit" />
      <p v-if="error" class="dialog__error">{{ error }}</p>
      <footer>
        <button type="button" @click="emit('close')">Cancel</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import type {SessionHost} from '../../../entities/session'
import type {CreateSessionInput} from '../../../features/session/create-session/createSession'
import {editSession} from '../../../features/session/edit-session/editSession'
import SessionForm from './SessionForm.vue'

const props = defineProps<{session: SessionHost}>()
const emit = defineEmits<{close: []}>()
const error = ref('')

const initialValue = computed<CreateSessionInput>(() => ({
  name: props.session.name,
  host: props.session.host,
  port: props.session.port,
  username: props.session.username,
  auth: props.session.auth ?? {type: 'agent'},
}))

function handleSubmit(input: CreateSessionInput) {
  try {
    editSession(props.session.id, input)
    emit('close')
  } catch (editError) {
    error.value = editError instanceof Error ? editError.message : String(editError)
  }
}
</script>
