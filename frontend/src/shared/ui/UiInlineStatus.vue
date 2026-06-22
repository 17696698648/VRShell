<template>
  <span :class="['ui-inline-status', `ui-inline-status--${status}`]" :title="title || label">
    <span class="ui-inline-status__dot" aria-hidden="true" />
    <span v-if="label" class="ui-inline-status__label">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{label?: string; status?: 'danger' | 'error' | 'idle' | 'info' | 'success' | 'warning' | 'connected' | 'connecting' | 'disconnected' | 'failed'; title?: string}>(), {label: '', status: 'idle', title: ''})
</script>
