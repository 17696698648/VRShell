<template>
  <label class="session-search">
    <Search :size="14" />
    <input :value="modelValue" aria-label="Search sessions" placeholder="Search sessions" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
    <span v-if="resultCount !== undefined" class="session-search__count">{{ resultCount }}</span>
    <button v-if="modelValue" type="button" aria-label="Clear session search" @click="$emit('update:modelValue', '')"><X :size="14" /></button>
  </label>
</template>

<script setup lang="ts">
import {Search, X} from '@lucide/vue'

defineProps<{modelValue: string; resultCount?: number}>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
