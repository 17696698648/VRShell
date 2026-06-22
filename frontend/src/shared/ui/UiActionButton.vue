<template>
  <UiTooltip :text="tooltipText" :shortcut="command?.shortcut ?? shortcut">
    <UiButton :disabled="disabled" :loading="running" :size="size" :variant="variant" @click="runAction">
      <component :is="icon" v-if="icon" :size="14" />
      <slot>{{ label }}</slot>
    </UiButton>
  </UiTooltip>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {executeCommand, getCommand, getCommandAvailability} from '../../features/workspace/command-registry'
import UiButton from './UiButton.vue'
import UiTooltip from './UiTooltip.vue'

const props = withDefaults(
  defineProps<{
    commandId?: string
    disabled?: boolean
    icon?: unknown
    label?: string
    shortcut?: string
    size?: 'sm' | 'md'
    tooltip?: string
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  }>(),
  {commandId: '', disabled: false, label: '', shortcut: '', size: 'sm', tooltip: '', variant: 'ghost'},
)

const running = ref(false)
const command = computed(() => props.commandId ? getCommand(props.commandId) : null)
const availability = computed(() => command.value ? getCommandAvailability(command.value) : {disabledReason: null, enabled: true, visible: true})
const disabled = computed(() => props.disabled || running.value || !availability.value.enabled)
const label = computed(() => props.label || command.value?.title || 'Action')
const tooltipText = computed(() => props.tooltip || availability.value.disabledReason || command.value?.description || label.value)

async function runAction() {
  if (disabled.value) return
  running.value = true
  try {
    if (props.commandId) await executeCommand(props.commandId)
  } finally {
    running.value = false
  }
}
</script>
