<template>
  <div class="search-wrap">
    <label class="search-box">
      <Search :size="12" />
      <input :value="modelValue" placeholder="Search name, host, user, remark, group..." @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
    </label>
    <small v-if="modelValue.trim()">Matching across host, user, remark, and group path</small>
  </div>
</template>

<script setup lang="ts">
import { Search } from '@lucide/vue'

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()
</script>

<style scoped>
.search-box {
  display: flex;
  gap: 5px;
  align-items: center;
  min-height: 26px;
  padding: 3px 6px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 7px;
  background: rgba(8, 11, 18, 0.44);
  color: #64748b;
  font-size: 12px;
}

.search-wrap {
  display: grid;
  gap: 4px;
}

.search-wrap small {
  padding: 0 4px;
  color: var(--idea-text-muted);
  font-size: 10px;
}

.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #e5edf8;
}
</style>
