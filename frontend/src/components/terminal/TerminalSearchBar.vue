<template>
  <div v-if="visible" class="terminal-search-bar" @keydown.escape="$emit('close')">
    <input
      ref="inputRef"
      :value="query"
      type="text"
      placeholder="Find..."
      @input="$emit('update:query', ($event.target as HTMLInputElement).value)"
      @keydown.enter="$emit('next')"
    />
    <button title="Previous match" @click="$emit('previous')">Prev</button>
    <button title="Next match" @click="$emit('next')">Next</button>
    <button title="Close" @click="$emit('close')">Close</button>
  </div>
</template>

<script setup lang="ts">
import {nextTick, ref, watch} from 'vue'

const props = defineProps<{
  visible: boolean
  query: string
}>()

defineEmits<{
  (event: 'update:query', value: string): void
  (event: 'previous'): void
  (event: 'next'): void
  (event: 'close'): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
watch(() => props.visible, async (visible) => {
  if (!visible) return
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
})
defineExpose({inputRef})
</script>

<style scoped>
.terminal-search-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.92);
  animation: searchSlideIn 0.16s ease;
}

@keyframes searchSlideIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.terminal-search-bar input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 4px 8px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 4px;
  background: rgba(2, 6, 23, 0.7);
  color: #e2e8f0;
  font-size: 12px;
  outline: none;
}

.terminal-search-bar input:focus {
  border-color: rgba(56, 189, 248, 0.5);
}

.terminal-search-bar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  height: 22px;
  padding: 0 6px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}

.terminal-search-bar button:hover {
  background: rgba(56, 189, 248, 0.14);
  color: #e2e8f0;
}
</style>
