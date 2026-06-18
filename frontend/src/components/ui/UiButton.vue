<template>
  <button class="ui-button" :class="variant" :type="type" v-bind="$attrs">
    <span v-if="$slots.icon" class="ui-button-icon"><slot name="icon" /></span>
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'toolbar' | 'primary' | 'ghost' | 'danger' | 'icon'
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'toolbar',
  type: 'button',
})
</script>

<style scoped>
.ui-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--idea-chrome) 76%, transparent);
  color: var(--idea-text-muted);
  font-size: 12px;
  font-weight: 700;
  transition: border-color var(--motion-fast), background var(--motion-fast), color var(--motion-fast), box-shadow var(--motion-fast);
}

.ui-button:hover {
  border-color: var(--state-border);
  color: var(--idea-text);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 14%, transparent);
}

.ui-button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 48%, transparent);
  outline-offset: 2px;
}

.ui-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
  box-shadow: none;
}

.ui-button.primary {
  border-color: color-mix(in srgb, var(--accent) 48%, transparent);
  background: linear-gradient(135deg, var(--accent-strong), #4f46e5);
  color: #f8fafc;
}

.ui-button.ghost {
  background: transparent;
}

.ui-button.danger {
  border-color: color-mix(in srgb, var(--status-danger) 36%, transparent);
  background: color-mix(in srgb, var(--status-danger) 18%, transparent);
  color: var(--danger-text);
}

.ui-button.icon {
  width: 30px;
  padding: 0;
}

.ui-button-icon {
  display: inline-grid;
  place-items: center;
}
</style>
