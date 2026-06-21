<template>
  <div v-if="feedbackState.toasts.length > 0" class="toast-host" aria-live="polite">
    <article v-for="toast in feedbackState.toasts" :key="toast.id" class="toast" :class="`toast--${toast.level}`">
      <div>
        <strong>{{ toast.title }}</strong>
        <p v-if="toast.detail">{{ toast.detail }}</p>
      </div>
      <button type="button" aria-label="Dismiss notification" @click="removeToast(toast.id)">×</button>
    </article>
  </div>
</template>

<script setup lang="ts">
import {feedbackState, removeToast} from '../../shared/feedback'
</script>
