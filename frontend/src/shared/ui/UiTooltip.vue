<template>
  <span class="ui-tooltip" :data-placement="placement">
    <slot />
    <span class="ui-tooltip__content" role="tooltip">
      {{ label }}
      <kbd v-if="shortcut">{{ shortcut }}</kbd>
    </span>
  </span>
</template>

<script setup lang="ts">
import {computed} from 'vue'

const props = withDefaults(
  defineProps<{
    content?: string
    placement?: 'top' | 'right' | 'bottom' | 'left'
    shortcut?: string
    text?: string
  }>(),
  {content: '', placement: 'top', shortcut: '', text: ''},
)

const label = computed(() => props.content || props.text)
</script>
