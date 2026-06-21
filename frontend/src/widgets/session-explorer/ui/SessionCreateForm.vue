<template>
  <SessionForm reset-on-submit submit-label="Create and connect" @submit="(input) => emit('submit', input)" />
</template>

<script setup lang="ts">
import type {CreateSessionInput} from '../../../features/session/create-session/createSession'
import SessionForm from './SessionForm.vue'

const emit = defineEmits<{submit: [input: CreateSessionInput]}>()
</script>
