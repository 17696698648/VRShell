<template>
  <div class="ui-toolbar-button-group" role="group" :aria-label="label">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      :class="['ui-toolbar-button-group__item', {active: item.id === modelValue}]"
      :disabled="item.disabled"
      :title="item.tooltip ?? item.label"
      :aria-pressed="item.id === modelValue"
      @click="$emit('update:modelValue', item.id)"
    >
      <component :is="item.icon" v-if="item.icon" :size="14" aria-hidden="true" />
      <span>{{ item.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type {Component} from 'vue'

export interface UiToolbarButtonGroupItem {
  disabled?: boolean
  icon?: Component
  id: string
  label: string
  tooltip?: string
}

withDefaults(defineProps<{items: UiToolbarButtonGroupItem[]; label?: string; modelValue?: string}>(), {label: 'Toolbar options', modelValue: ''})
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
