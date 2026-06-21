<template>
  <span class="ui-tooltip" :data-placement="placement">
    <slot />
    <span class="ui-tooltip__content" role="tooltip">
      {{ content }}
      <kbd v-if="shortcut">{{ shortcut }}</kbd>
    </span>
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    content: string
    placement?: 'top' | 'right' | 'bottom' | 'left'
    shortcut?: string
  }>(),
  {placement: 'top', shortcut: ''},
)
</script>
