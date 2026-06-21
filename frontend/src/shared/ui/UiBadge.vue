<template>
  <span :class="['ui-badge', `ui-badge--${intent}`]"><slot /></span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{intent?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'}>(), {intent: 'neutral'})
</script>
