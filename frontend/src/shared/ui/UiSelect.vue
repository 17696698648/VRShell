<template>
  <label class="ui-field" :class="{disabled}">
    <span v-if="label" class="ui-field__label">{{ label }}</span>
    <select :value="modelValue" :disabled="disabled" @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
      <option v-if="placeholder" disabled value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value" :disabled="option.disabled">
        {{ option.label }}
      </option>
    </select>
    <small v-if="description" class="ui-field__description">{{ description }}</small>
  </label>
</template>

<script setup lang="ts">
export interface UiSelectOption {
  disabled?: boolean
  label: string
  value: string
}

withDefaults(
  defineProps<{
    description?: string
    disabled?: boolean
    label?: string
    modelValue: string
    options: UiSelectOption[]
    placeholder?: string
  }>(),
  {description: '', disabled: false, label: '', placeholder: ''},
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
