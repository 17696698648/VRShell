<template>
  <section class="dialog-section" :class="{ compact }">
    <div class="section-heading">
      <span>{{ index }}</span>
      <div>
        <strong>{{ title }}</strong>
        <small>{{ description }}</small>
      </div>
    </div>
    <slot/>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  index: string
  title: string
  description: string
  compact?: boolean
}>()
</script>

<style scoped>
.dialog-section {
  display: grid;
  gap: 12px;
  margin: 0 16px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--accent) 12%, var(--idea-border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--ui-surface-3, var(--idea-chrome)) 54%, transparent);
}

.dialog-section:first-of-type {
  margin-top: 4px;
}

.dialog-section.compact {
  gap: 10px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.section-heading > span {
  display: inline-grid;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 7px;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: color-mix(in srgb, var(--accent) 86%, #ffffff);
  font-size: 10px;
  font-weight: 900;
}

.section-heading strong {
  display: block;
  color: var(--idea-text);
  font-size: 13px;
}

.section-heading small {
  display: block;
  margin-top: 2px;
  color: var(--idea-text-muted);
  font-size: 11px;
}
</style>
