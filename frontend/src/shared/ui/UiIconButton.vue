<template>
  <UiTooltip :text="label">
    <button class="ui-icon-button" :class="[size, variant]" type="button" :aria-label="label" :disabled="disabled" @click="$emit('click', $event)">
      <component :is="icon" :size="iconSize" />
    </button>
  </UiTooltip>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import UiTooltip from './UiTooltip.vue'

const props = withDefaults(defineProps<{disabled?: boolean; icon: unknown; label: string; size?: 'sm' | 'md'; variant?: 'ghost' | 'primary' | 'secondary' | 'danger'}>(), {disabled: false, size: 'sm', variant: 'ghost'})
defineEmits<{click: [event: MouseEvent]}>()

const iconSize = computed(() => props.size === 'md' ? 16 : 14)
</script>
