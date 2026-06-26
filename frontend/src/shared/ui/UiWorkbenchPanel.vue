<template>
  <section :class="['ui-workbench-panel', {compact}]" :aria-label="ariaLabel ?? title" :aria-busy="loading || undefined">
    <header v-if="title || subtitle || $slots.actions" class="ui-workbench-panel__header">
      <div v-if="$slots.icon" class="ui-workbench-panel__icon" aria-hidden="true">
        <slot name="icon" />
      </div>
      <div class="ui-workbench-panel__title">
        <strong v-if="title">{{ title }}</strong>
        <small v-if="subtitle">{{ subtitle }}</small>
      </div>
      <div v-if="$slots.primary" class="ui-workbench-panel__primary-action">
        <slot name="primary" />
      </div>
      <div v-if="$slots.actions" class="ui-workbench-panel__actions">
        <slot name="actions" />
      </div>
    </header>
    <div v-if="$slots.toolbar" class="ui-workbench-panel__toolbar">
      <slot name="toolbar" />
    </div>
    <main class="ui-workbench-panel__body">
      <slot />
    </main>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    ariaLabel?: string
    compact?: boolean
    loading?: boolean
    subtitle?: string
    title?: string
  }>(),
  {ariaLabel: '', compact: false, subtitle: '', title: ''},
)
</script>
