<template>
  <section class="ui-disclosure" :class="{'ui-disclosure--open': open}">
    <button class="ui-disclosure__summary" type="button" :aria-expanded="open" @click="$emit('update:open', !open)">
      <ChevronRight :size="14" aria-hidden="true" />
      <span class="ui-disclosure__title"><slot name="title">{{ title }}</slot></span>
      <span v-if="badge" class="ui-disclosure__badge">{{ badge }}</span>
      <span v-if="$slots.actions" class="ui-disclosure__actions" @click.stop><slot name="actions" /></span>
    </button>
    <div v-if="open" class="ui-disclosure__content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import {ChevronRight} from '@lucide/vue'

withDefaults(defineProps<{badge?: number | string; open?: boolean; title?: string}>(), {badge: '', open: false, title: ''})
defineEmits<{ 'update:open': [open: boolean] }>()
</script>
