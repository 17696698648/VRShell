<template>
  <div v-if="visible" class="modal-backdrop" @click="handleClose">
    <component
        :is="as"
        ref="dialogRef"
        class="base-dialog"
        :class="{ 'body-scrollable': bodyScrollable, flush: flush }"
        :style="dialogStyle"
        tabindex="-1"
        @click.stop
        @keydown.escape="handleClose"
        @keydown.tab="trapFocus"
        @submit.prevent="emit('submit')"
    >
      <header v-if="title || message || $slots.header || $slots.headerActions" class="base-dialog-header">
        <slot name="header">
          <div>
            <strong v-if="title">{{ title }}</strong>
            <small v-if="message">{{ message }}</small>
          </div>
        </slot>
        <div v-if="$slots.headerActions" class="base-dialog-header-actions">
          <slot name="headerActions"/>
        </div>
      </header>
      <div v-if="$slots.default" class="base-dialog-body">
        <slot/>
      </div>
      <footer v-if="$slots.footer" class="base-dialog-actions">
        <slot name="footer"/>
      </footer>
    </component>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue'

const props = withDefaults(defineProps<{
  visible: boolean
  title?: string
  message?: string
  width?: string
  maxHeight?: string
  as?: string
  closeOnBackdrop?: boolean
  bodyScrollable?: boolean
  flush?: boolean
}>(), {
  title: '',
  message: '',
  width: '400px',
  maxHeight: '',
  as: 'section',
  closeOnBackdrop: true,
  bodyScrollable: false,
  flush: false,
})

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit'): void
}>()

const dialogRef = ref<HTMLElement | null>(null)
let previouslyFocusedElement: HTMLElement | null = null

const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const dialogStyle = computed(() => ({
  width: `min(${props.width}, calc(100vw - 40px))`,
  maxHeight: props.maxHeight || undefined,
}))

watch(() => props.visible, async (visible) => {
  if (visible) {
    previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null

    await nextTick()
    const firstFocusable = getFocusableElements()[0]
    ;(firstFocusable ?? dialogRef.value)?.focus()
    return
  }

  await nextTick()
  previouslyFocusedElement?.focus()
  previouslyFocusedElement = null
}, {immediate: true})

function getFocusableElements() {
  return Array.from(dialogRef.value?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
      .filter((element) => element.offsetParent !== null || element === document.activeElement)
}

function trapFocus(event: KeyboardEvent) {
  const focusableElements = getFocusableElements()
  if (focusableElements.length === 0) {
    event.preventDefault()
    dialogRef.value?.focus()
    return
  }

  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault()
    lastElement.focus()
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault()
    firstElement.focus()
  }
}

function handleClose() {
  if (props.closeOnBackdrop) {
    emit('close')
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.46);
}

.base-dialog {
  display: grid;
  gap: 14px;
  overflow: hidden;
  padding: 16px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 12%, transparent), transparent 44%),
  color-mix(in srgb, var(--idea-panel) 90%, transparent);
  box-shadow: var(--shadow-dialog), var(--glow-accent);
  backdrop-filter: blur(18px);
}

.base-dialog.flush {
  gap: 0;
  padding: 0;
}

.base-dialog.body-scrollable {
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.base-dialog-header,
.base-dialog-body {
  display: grid;
  gap: 6px;
}

.base-dialog.flush .base-dialog-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--idea-border);
  background: var(--idea-chrome);
}

.base-dialog.flush .base-dialog-actions {
  padding: 14px 16px;
  border-top: 1px solid var(--idea-border);
  background: var(--idea-chrome);
}

.base-dialog-header {
  align-items: start;
}

.base-dialog-header:has(.base-dialog-header-actions) {
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
}

.base-dialog-header strong {
  display: block;
  color: #f8fafc;
  font-size: 15px;
}

.base-dialog-header small {
  display: block;
  margin-top: 4px;
  color: #94a3b8;
  line-height: 1.5;
}

.base-dialog-header-actions {
  display: flex;
  align-items: center;
}

.base-dialog.body-scrollable .base-dialog-body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.base-dialog-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}
</style>
