<template>
  <div class="ui-toolbar" :class="[density, {bordered}]" role="toolbar" :aria-label="label">
    <div v-if="$slots.leading" class="ui-toolbar__group">
      <slot name="leading" />
    </div>
    <div v-if="$slots.default" class="ui-toolbar__content">
      <slot />
    </div>
    <div v-if="$slots.trailing" class="ui-toolbar__group align-end">
      <slot name="trailing" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    bordered?: boolean
    density?: 'compact' | 'comfortable'
    label?: string
  }>(),
  {bordered: false, density: 'compact', label: 'Toolbar'},
)
</script>
