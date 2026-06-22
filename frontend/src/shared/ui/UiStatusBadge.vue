<template>
  <span :class="['ui-status-badge', `ui-status-badge--${intent}`]" :title="label">
    <span class="ui-status-badge__dot" aria-hidden="true" />
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
import {computed} from 'vue'

const props = withDefaults(
  defineProps<{
    label?: string
    status?: 'idle' | 'running' | 'success' | 'warning' | 'danger' | 'info' | 'connected' | 'connecting' | 'disconnected' | 'failed' | 'cancelled' | 'done'
  }>(),
  {label: '', status: 'idle'},
)

const intent = computed(() => {
  if (props.status === 'connected' || props.status === 'success' || props.status === 'done') return 'success'
  if (props.status === 'connecting' || props.status === 'running' || props.status === 'info') return 'info'
  if (props.status === 'warning') return 'warning'
  if (props.status === 'failed' || props.status === 'danger' || props.status === 'cancelled' || props.status === 'disconnected') return 'danger'
  return 'neutral'
})

const label = computed(() => props.label || props.status)
</script>
