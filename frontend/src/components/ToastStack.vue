<template>
  <div class="toast-stack">
    <div v-for="toast in toasts" :key="toast.id" class="toast" :class="toast.type">{{ toast.message }}</div>
  </div>
</template>

<script setup lang="ts">
import type {ToastMessage} from '../types'

defineProps<{
  toasts: ToastMessage[]
}>()
</script>

<style scoped>
.toast-stack {
  position: fixed;
  right: 16px;
  bottom: 42px;
  z-index: var(--z-toast);
  display: grid;
  gap: 8px;
  pointer-events: none;
}

.toast {
  max-width: 320px;
  padding: 8px 11px;
  border: 1px solid var(--idea-border-strong);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--idea-panel) 94%, #020617 6%);
  color: #dbeafe;
  font-size: 12px;
  box-shadow: var(--shadow-popover);
  animation: toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast.success {
  border-color: color-mix(in srgb, var(--status-online) 42%, transparent);
  background: linear-gradient(90deg, var(--status-online-soft), transparent 42%), color-mix(in srgb, var(--idea-panel) 94%, #020617 6%);
  color: #bbf7d0;
}

.toast.error {
  border-color: color-mix(in srgb, var(--status-danger) 42%, transparent);
  background: linear-gradient(90deg, var(--status-danger-soft), transparent 42%), color-mix(in srgb, var(--idea-panel) 94%, #020617 6%);
  color: #fecaca;
}

@keyframes toast-in {
  from {
    transform: translateX(120%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
