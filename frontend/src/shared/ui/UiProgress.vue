<template>
  <div class="ui-progress" :class="status">
    <div class="ui-progress__meta">
      <span v-if="label">{{ label }}</span>
      <small>{{ normalizedValue }}%</small>
    </div>
    <progress :value="normalizedValue" max="100" :aria-label="label || 'Progress'" />
    <div v-if="speed || eta || $slots.action" class="ui-progress__details">
      <small v-if="speed">{{ speed }}</small>
      <small v-if="eta">{{ eta }}</small>
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'

const props = withDefaults(
  defineProps<{
    eta?: string
    label?: string
    speed?: string
    status?: 'idle' | 'running' | 'success' | 'warning' | 'error'
    value: number
  }>(),
  {eta: '', label: '', speed: '', status: 'idle'},
)

const normalizedValue = computed(() => Math.min(100, Math.max(0, Math.round(props.value))))
</script>
