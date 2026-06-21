<template>
  <form class="session-form" @submit.prevent="submit">
    <input v-model="form.name" required placeholder="Name" />
    <input v-model="form.host" required placeholder="Host" />
    <input v-model.number="form.port" required min="1" max="65535" type="number" placeholder="Port" />
    <input v-model="form.username" required placeholder="Username" />
    <ul v-if="errors.length > 0" class="session-form__errors">
      <li v-for="error in errors" :key="error">{{ error }}</li>
    </ul>
    <button type="submit">{{ submitLabel }}</button>
  </form>
</template>

<script setup lang="ts">
import {reactive, ref, watch} from 'vue'
import {validateSessionFields} from '../../../entities/session'
import type {CreateSessionInput} from '../../../features/session/create-session/createSession'

const props = withDefaults(
  defineProps<{
    initialValue?: CreateSessionInput
    resetOnSubmit?: boolean
    submitLabel?: string
  }>(),
  {
    resetOnSubmit: false,
    submitLabel: 'Save',
  },
)
const emit = defineEmits<{submit: [input: CreateSessionInput]}>()
const errors = ref<string[]>([])
const form = reactive<CreateSessionInput>(createInitialValue())

watch(
  () => props.initialValue,
  () => resetForm(),
  {deep: true},
)

function submit() {
  const input = normalizeInput(form)
  const result = validateSessionFields(input)
  errors.value = result.errors
  if (!result.valid) return
  emit('submit', input)
  if (props.resetOnSubmit) resetForm()
}

function resetForm() {
  Object.assign(form, createInitialValue())
  errors.value = []
}

function createInitialValue(): CreateSessionInput {
  return props.initialValue
    ? {...props.initialValue, auth: props.initialValue.auth}
    : {name: '', host: '', port: 22, username: '', auth: {type: 'agent'}}
}

function normalizeInput(input: CreateSessionInput): CreateSessionInput {
  return {...input, name: input.name.trim(), host: input.host.trim(), username: input.username.trim()}
}
</script>
