<template>
  <div class="empty-state">
    <span class="empty-state-icon"><slot name="icon">⌘</slot></span>
    <strong>{{ title }}</strong>
    <small>{{ description }}</small>
    <div v-if="$slots.actions" class="empty-state-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<style scoped>
.empty-state {
  display: grid;
  justify-items: center;
  gap: 10px;
  max-width: 420px;
  padding: 24px;
  border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--idea-border));
  border-radius: 16px;
  background: color-mix(in srgb, var(--idea-panel) 70%, transparent);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.04), 0 18px 52px rgba(0, 0, 0, 0.24);
  text-align: center;
}

.empty-state-icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 16px;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: color-mix(in srgb, var(--accent) 86%, #ffffff);
  font-size: 22px;
}

.empty-state strong {
  color: var(--idea-text);
  font-size: 15px;
}

.empty-state small {
  color: var(--idea-text-muted);
  line-height: 1.55;
}

.empty-state-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 2px;
}
</style>
