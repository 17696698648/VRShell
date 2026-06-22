<template>
  <section class="ui-error-state" role="alert">
    <div class="ui-error-state__icon" aria-hidden="true"><TriangleAlert :size="18" /></div>
    <div class="ui-error-state__content">
      <strong>{{ title }}</strong>
      <span>{{ message }}</span>
      <small v-if="detail">{{ detail }}</small>
    </div>
    <div v-if="$slots.actions || retryLabel" class="ui-error-state__actions">
      <slot name="actions">
        <UiButton v-if="retryLabel" size="sm" variant="danger" @click="$emit('retry')">{{ retryLabel }}</UiButton>
      </slot>
    </div>
  </section>
</template>

<script setup lang="ts">
import {TriangleAlert} from '@lucide/vue'
import UiButton from './UiButton.vue'

withDefaults(defineProps<{detail?: string; message: string; retryLabel?: string; title?: string}>(), {detail: '', retryLabel: '', title: 'Something went wrong'})
defineEmits<{retry: []}>()
</script>
