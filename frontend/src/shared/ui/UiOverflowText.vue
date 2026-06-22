<template>
  <span class="ui-overflow-text" :title="tooltip || text">
    <slot>{{ displayText }}</slot>
    <button v-if="copyable" class="ui-overflow-text__copy" type="button" :aria-label="`Copy ${copyLabel}`" @click.stop="copyText">Copy</button>
  </span>
</template>

<script setup lang="ts">
import {computed} from 'vue'

const props = withDefaults(defineProps<{copyLabel?: string; copyable?: boolean; middle?: boolean; text: string; tooltip?: string}>(), {copyLabel: 'text', copyable: false, middle: false, tooltip: ''})
const displayText = computed(() => props.middle ? middleEllipsis(props.text) : props.text)

async function copyText() {
  await navigator.clipboard?.writeText(props.text)
}

function middleEllipsis(value: string) {
  if (value.length <= 36) return value
  return `${value.slice(0, 16)}...${value.slice(-16)}`
}
</script>
