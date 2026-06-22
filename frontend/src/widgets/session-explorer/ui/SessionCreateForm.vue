<template>
  <div class="dialog-backdrop" @click.self="emit('close')">
    <section class="dialog session-create-dialog" role="dialog" aria-modal="true" aria-labelledby="session-create-title">
      <header>
        <h2 id="session-create-title">New session</h2>
      </header>
      <SessionForm reset-on-submit submit-label="Create and connect" @submit="(input) => emit('submit', input)" />
      <footer>
        <button type="button" @click="emit('close')">Cancel</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import type {CreateSessionInput} from '../../../features/session/create-session/createSession'
import SessionForm from './SessionForm.vue'

const emit = defineEmits<{close: []; submit: [input: CreateSessionInput]}>()
</script>
