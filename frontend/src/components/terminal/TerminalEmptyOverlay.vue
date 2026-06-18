<template>
  <div v-if="visible" class="terminal-empty-overlay">
    <div class="terminal-empty-card">
      <span class="terminal-empty-icon">&gt;</span>
      <strong>Terminal is idle</strong>
      <small>Reconnect this terminal when you are ready to continue the SSH session.</small>
      <UiButton title="Reconnect terminal" aria-label="Reconnect terminal" @click.stop="$emit('reconnect')">
        Reconnect
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import UiButton from '../ui/UiButton.vue'

defineProps<{
  visible: boolean
}>()

defineEmits<{
  (event: 'reconnect'): void
}>()
</script>

<style scoped>
.terminal-empty-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-items: center;
  pointer-events: none;
  background: radial-gradient(circle at center, rgba(15, 23, 42, 0.52), transparent 58%);
}

.terminal-empty-card {
  display: grid;
  justify-items: center;
  gap: 8px;
  max-width: 320px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.72);
  color: #dbeafe;
  text-align: center;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
  pointer-events: auto;
  backdrop-filter: blur(12px);
}

.terminal-empty-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 14px;
  background: rgba(56, 189, 248, 0.12);
  color: #7dd3fc;
  font-size: 20px;
}

.terminal-empty-card small {
  color: #94a3b8;
  line-height: 1.5;
}
</style>
