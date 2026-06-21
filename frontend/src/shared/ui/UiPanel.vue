<template>
  <section :class="['ui-panel', {compact}]" :aria-busy="loading || undefined">
    <header v-if="title || subtitle || $slots.actions" class="ui-panel__header">
      <div class="ui-panel__title">
        <strong v-if="title">{{ title }}</strong>
        <small v-if="subtitle">{{ subtitle }}</small>
      </div>
      <div v-if="$slots.actions" class="ui-panel__actions">
        <slot name="actions" />
      </div>
    </header>
    <p v-if="error" class="ui-panel__error">{{ error }}</p>
    <div class="ui-panel__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  compact?: boolean
  error?: string
  loading?: boolean
  subtitle?: string
  title?: string
}>()
</script>
