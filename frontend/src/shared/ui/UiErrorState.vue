<template>
  <section class="ui-error-state" :class="[`ui-error-state--${tone}`, {compact}]" role="alert">
    <div class="ui-error-state__icon" aria-hidden="true"><TriangleAlert :size="18" /></div>
    <div class="ui-error-state__content">
      <strong>{{ title }}</strong>
      <span>{{ message }}</span>
      <small v-if="detail">{{ detail }}</small>
    </div>
    <div v-if="$slots.actions || retryLabel" class="ui-error-state__actions">
      <slot name="actions">
        <UiButton v-if="retryLabel" size="sm" variant="danger" @click="$emit('retry')">{{ retryLabel }}</UiButton>
        <UiButton v-if="copyable" size="sm" variant="ghost" @click="copyError">Copy Error</UiButton>
        <UiActionButton v-if="logsCommandId" :command-id="logsCommandId" label="Open Logs" />
      </slot>
    </div>
  </section>
</template>

<script setup lang="ts">
import {TriangleAlert} from '@lucide/vue'
import UiActionButton from './UiActionButton.vue'
import UiButton from './UiButton.vue'

const props = withDefaults(defineProps<{compact?: boolean; copyable?: boolean; detail?: string; logsCommandId?: string; message: string; retryLabel?: string; title?: string; tone?: 'danger' | 'warning'}>(), {
  compact: false,
  copyable: false,
  detail: '',
  logsCommandId: '',
  retryLabel: '',
  title: 'Something went wrong',
  tone: 'danger',
})
defineEmits<{retry: []}>()

async function copyError() {
  await navigator.clipboard?.writeText([props.title, props.message, props.detail].filter(Boolean).join('\n'))
}
</script>
