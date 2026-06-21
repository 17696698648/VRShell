<template>
  <input class="panel-search" :value="modelValue" placeholder="Search sessions" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
</template>

<script setup lang="ts">
defineProps<{modelValue: string}>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
