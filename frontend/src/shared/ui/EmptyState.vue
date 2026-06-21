<template>
  <section class="empty-state" :class="{compact}">
    <div v-if="icon" class="empty-state__icon" aria-hidden="true">{{ icon }}</div>
    <div class="empty-state__content">
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="empty-state__actions">
      <slot name="actions" />
    </div>
    <div v-if="$slots.secondary" class="empty-state__secondary">
      <slot name="secondary" />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    compact?: boolean
    icon?: string
    title: string
    description: string
  }>(),
  {compact: false, icon: ''},
)
</script>
