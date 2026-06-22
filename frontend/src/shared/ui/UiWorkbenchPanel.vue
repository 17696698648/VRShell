<template>
  <section :class="['ui-workbench-panel', {compact}]" :aria-label="ariaLabel ?? title" :aria-busy="loading || undefined">
    <header v-if="title || subtitle || $slots.actions" class="ui-workbench-panel__header">
      <div class="ui-workbench-panel__title">
        <strong v-if="title">{{ title }}</strong>
        <small v-if="subtitle">{{ subtitle }}</small>
      </div>
      <div v-if="$slots.actions" class="ui-workbench-panel__actions">
        <slot name="actions" />
      </div>
    </header>
    <div v-if="$slots.toolbar" class="ui-workbench-panel__toolbar">
      <slot name="toolbar" />
    </div>
    <UiErrorState v-if="error" :message="error" :title="errorTitle" :retry-label="retryLabel" :logs-command-id="logsCommandId" copyable @retry="$emit('retry')" />
    <main class="ui-workbench-panel__body">
      <slot />
    </main>
    <footer v-if="$slots.footer" class="ui-workbench-panel__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup lang="ts">
import UiErrorState from './UiErrorState.vue'

withDefaults(
  defineProps<{
    ariaLabel?: string
    compact?: boolean
    error?: string
    errorTitle?: string
    loading?: boolean
    logsCommandId?: string
    retryLabel?: string
    subtitle?: string
    title?: string
  }>(),
  {ariaLabel: '', compact: false, error: '', errorTitle: 'Something went wrong', logsCommandId: '', retryLabel: '', subtitle: '', title: ''},
)
defineEmits<{retry: []}>()
</script>
