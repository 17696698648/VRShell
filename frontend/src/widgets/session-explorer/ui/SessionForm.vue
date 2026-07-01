<template>
  <form class="session-form" @submit.prevent="submit">
    <UiInput v-model="form.name" label="Name" placeholder="Production bastion" />
    <UiInput v-model="form.host" label="Host" placeholder="example.com or 10.0.0.12" />
    <UiInput :model-value="String(form.port)" label="Port" placeholder="22" type="number" @update:model-value="form.port = Number($event)" />
    <UiInput v-model="form.username" label="Username" placeholder="root" />
    <UiInput :model-value="tagText" label="Tags" placeholder="prod, api, bastion" @update:model-value="tagText = $event" />
    <label class="session-form__favorite"><input v-model="favorite" type="checkbox" /> Favorite session</label>
    <UiSelect :model-value="form.auth.type" label="Authentication" :options="authOptions" @update:model-value="setAuthType" />
    <p class="session-form__hint">On first connection, verify the host-key fingerprint before trusting the server. If a saved host key changes, stop and confirm with your administrator.</p>
    <p v-if="form.auth.type === 'agent'" class="session-form__hint">Uses your local SSH agent. No secret is stored by VRShell.</p>
    <template v-if="form.auth.type === 'password'">
      <UiInput :model-value="form.auth.password ?? ''" label="Password" placeholder="Password" type="password" @update:model-value="form.auth.password = $event" />
      <p class="session-form__hint">Passwords are stored in the OS keyring after saving and are masked in the UI.</p>
    </template>
    <template v-if="form.auth.type === 'key'">
      <UiInput :model-value="form.auth.privateKeyPath ?? ''" label="Private key" placeholder="~/.ssh/id_ed25519" @update:model-value="form.auth.privateKeyPath = $event" />
      <UiInput :model-value="form.auth.passphrase ?? ''" label="Passphrase" placeholder="Optional" type="password" @update:model-value="form.auth.passphrase = $event" />
      <p class="session-form__hint">Private keys stay on disk. Only the path and optional passphrase are sent to the SSH backend.</p>
    </template>
    <ul v-if="errors.length > 0" class="session-form__errors">
      <li v-for="error in errors" :key="error">{{ error }}</li>
    </ul>
    <UiButton type="submit" variant="primary">{{ submitLabel }}</UiButton>
  </form>
</template>

<script setup lang="ts">
import {reactive, ref, watch} from 'vue'
import {validateSessionFields, type SessionAuth} from '../../../entities/session'
import type {CreateSessionInput} from '../../../features/session/create-session/createSession'
import {favoriteSessionTag} from '../../../features/session/edit-session/sessionActions'
import {UiButton, UiInput, UiSelect, type UiSelectOption} from '../../../shared/ui'

const props = withDefaults(
  defineProps<{
    modelValue?: CreateSessionInput | null
    initialValue?: CreateSessionInput
    resetOnSubmit?: boolean
    submitLabel?: string
  }>(),
  {
    resetOnSubmit: false,
    submitLabel: 'Save',
  },
)
const emit = defineEmits<{submit: [input: CreateSessionInput]; 'update:modelValue': [input: CreateSessionInput]}>()
const errors = ref<string[]>([])
const form = reactive<CreateSessionInput>(createInitialValue())
const tagText = ref(tagsToText(form.tags ?? []))
const favorite = ref(form.tags?.includes(favoriteSessionTag) ?? false)
const authOptions: UiSelectOption[] = [
  {label: 'SSH agent', value: 'agent'},
  {label: 'Password', value: 'password'},
  {label: 'Private key', value: 'key'},
]

watch(
  () => props.initialValue,
  () => resetForm(),
  {deep: true},
)

watch(
  [form, tagText, favorite],
  () => emit('update:modelValue', normalizeInput(form)),
  {deep: true, immediate: true},
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
  tagText.value = tagsToText(form.tags ?? [])
  favorite.value = form.tags?.includes(favoriteSessionTag) ?? false
  errors.value = []
}

function createInitialValue(): CreateSessionInput {
  return props.initialValue
    ? {...props.initialValue, auth: props.initialValue.auth}
    : {name: '', host: '', port: 22, username: '', auth: {type: 'agent'}}
}

function normalizeInput(input: CreateSessionInput): CreateSessionInput {
  return {...input, name: input.name.trim(), host: input.host.trim(), username: input.username.trim(), auth: normalizeAuth(input.auth), tags: normalizeTags()}
}

function normalizeTags() {
  const tags = tagText.value.split(',').map((tag) => tag.trim()).filter(Boolean).filter((tag) => tag !== favoriteSessionTag)
  if (favorite.value) tags.unshift(favoriteSessionTag)
  return Array.from(new Set(tags))
}

function tagsToText(tags: string[]) {
  return tags.filter((tag) => tag !== favoriteSessionTag).join(', ')
}

function setAuthType(type: string) {
  if (type === 'password') form.auth = {type: 'password', password: ''}
  else if (type === 'key') form.auth = {type: 'key', privateKeyPath: '', passphrase: ''}
  else form.auth = {type: 'agent'}
}

function normalizeAuth(auth: SessionAuth): SessionAuth {
  if (auth.type === 'password') return {type: 'password', password: auth.password?.trim() || null, credentialRef: auth.credentialRef ?? null}
  if (auth.type === 'key') {
    return {
      type: 'key',
      privateKeyPath: auth.privateKeyPath?.trim() || null,
      passphrase: auth.passphrase?.trim() || null,
    }
  }
  return {type: 'agent'}
}
</script>
