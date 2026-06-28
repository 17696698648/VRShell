<template>
  <label class="ui-field" :class="{disabled: disabled || readonly, invalid: Boolean(error)}">
    <span v-if="label" class="ui-field__label">{{ label }}</span>
    <span class="ui-input">
      <span v-if="$slots.prefix" class="ui-input__affix"><slot name="prefix" /></span>
      <input
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :type="type"
        :aria-invalid="Boolean(error) || undefined"
        :aria-describedby="descriptionId"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @keydown.enter="emit('enter')"
      />
      <button v-if="clearable && modelValue" type="button" aria-label="Clear input" @click="emit('update:modelValue', '')">×</button>
      <kbd v-if="shortcut">{{ shortcut }}</kbd>
      <span v-if="$slots.suffix" class="ui-input__affix"><slot name="suffix" /></span>
    </span>
    <small v-if="error" :id="descriptionId" class="ui-field__error">{{ error }}</small>
    <small v-else-if="description" :id="descriptionId" class="ui-field__description">{{ description }}</small>
  </label>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {createId} from '../lib/createId'

const props = withDefaults(
  defineProps<{
    clearable?: boolean
    description?: string
    disabled?: boolean
    error?: string
    label?: string
    modelValue: string
    placeholder?: string
    readonly?: boolean
    shortcut?: string
    type?: string
  }>(),
  {clearable: false, description: '', disabled: false, error: '', label: '', placeholder: '', readonly: false, shortcut: '', type: 'text'},
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  enter: []
}>()

const fieldDescriptionId = createId('ui-input-description')
const descriptionId = computed(() => props.description || props.error ? fieldDescriptionId : undefined)
</script>
