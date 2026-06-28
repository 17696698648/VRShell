<template>
  <label class="ui-field" :class="{disabled, invalid: Boolean(error)}">
    <span v-if="label" class="ui-field__label">{{ label }}</span>
    <select
      :value="modelValue"
      :disabled="disabled"
      :aria-invalid="Boolean(error) || undefined"
      :aria-describedby="descriptionId"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="placeholder" disabled value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value" :disabled="option.disabled">
        {{ option.label }}
      </option>
    </select>
    <small v-if="error" :id="descriptionId" class="ui-field__error">{{ error }}</small>
    <small v-else-if="description" :id="descriptionId" class="ui-field__description">{{ description }}</small>
  </label>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {createId} from '../lib/createId'

export interface UiSelectOption {
  disabled?: boolean
  label: string
  value: string
}

const props = withDefaults(
  defineProps<{
    description?: string
    disabled?: boolean
    error?: string
    label?: string
    modelValue: string
    options: UiSelectOption[]
    placeholder?: string
  }>(),
  {description: '', disabled: false, error: '', label: '', placeholder: ''},
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const fieldDescriptionId = createId('ui-select-description')
const descriptionId = computed(() => props.description || props.error ? fieldDescriptionId : undefined)
</script>
