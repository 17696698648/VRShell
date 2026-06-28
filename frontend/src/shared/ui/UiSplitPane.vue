<template>
  <div ref="rootRef" class="ui-split-pane" :class="direction" :style="paneStyle">
    <section class="ui-split-pane__pane" :class="firstPaneClass"><slot name="first" /></section>
    <button
      class="ui-split-pane__handle"
      type="button"
      role="separator"
      :aria-label="label"
      :aria-orientation="ariaOrientation"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="Math.round(modelValue)"
      @keydown="resizeWithKeyboard"
      @pointerdown="startResize"
    />
    <section class="ui-split-pane__pane" :class="secondPaneClass"><slot name="second" /></section>
  </div>
</template>

<script setup lang="ts">
import {computed, ref, type HTMLAttributes} from 'vue'

type PaneClass = HTMLAttributes['class']

const props = withDefaults(
  defineProps<{
    direction?: 'horizontal' | 'vertical'
    firstPaneClass?: PaneClass
    label?: string
    max?: number
    min?: number
    modelValue: number
    secondPaneClass?: PaneClass
  }>(),
  {direction: 'horizontal', label: 'Resize pane', max: 80, min: 20},
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'resize-end': [value: number]
}>()

const rootRef = ref<HTMLElement | null>(null)
const paneStyle = computed(() => ({'--split-size': `${props.modelValue}%`}))
const ariaOrientation = computed(() => (props.direction === 'horizontal' ? 'vertical' : 'horizontal'))

function startResize(event: PointerEvent) {
  const root = rootRef.value
  if (!root) return
  event.preventDefault()
  event.currentTarget instanceof HTMLElement && event.currentTarget.setPointerCapture(event.pointerId)
  const rect = root.getBoundingClientRect()

  function getNextValue(pointerEvent: PointerEvent) {
    const raw = props.direction === 'horizontal' ? ((pointerEvent.clientX - rect.left) / rect.width) * 100 : ((pointerEvent.clientY - rect.top) / rect.height) * 100
    return clamp(raw)
  }

  function move(pointerEvent: PointerEvent) {
    emit('update:modelValue', getNextValue(pointerEvent))
  }

  function end(pointerEvent: PointerEvent) {
    const nextValue = getNextValue(pointerEvent)
    emit('update:modelValue', nextValue)
    event.currentTarget instanceof HTMLElement && event.currentTarget.releasePointerCapture(pointerEvent.pointerId)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
    emit('resize-end', nextValue)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end)
}

function resizeWithKeyboard(event: KeyboardEvent) {
  const step = event.shiftKey ? 10 : 2
  const reverseStep = props.direction === 'horizontal' ? step : -step
  const nextValueByKey: Record<string, number> = {
    ArrowDown: props.modelValue + step,
    ArrowLeft: props.modelValue - reverseStep,
    ArrowRight: props.modelValue + reverseStep,
    ArrowUp: props.modelValue - step,
    End: props.max,
    Home: props.min,
  }
  const nextValue = nextValueByKey[event.key]
  if (nextValue === undefined) return
  event.preventDefault()
  const clampedValue = clamp(nextValue)
  emit('update:modelValue', clampedValue)
  emit('resize-end', clampedValue)
}

function clamp(value: number) {
  return Math.min(props.max, Math.max(props.min, Math.round(value)))
}
</script>
