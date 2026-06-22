<template>
  <ArrowUpDown v-if="!active" :size="12" aria-hidden="true" />
  <ArrowUp v-else-if="direction === 'asc'" :size="12" aria-hidden="true" />
  <ArrowDown v-else :size="12" aria-hidden="true" />
</template>

<script setup lang="ts">
import {ArrowDown, ArrowUp, ArrowUpDown} from '@lucide/vue'

withDefaults(defineProps<{active?: boolean; direction?: 'asc' | 'desc'}>(), {active: false, direction: 'asc'})
</script>
