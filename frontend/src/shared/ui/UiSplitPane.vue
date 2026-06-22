<template>
  <div ref="rootRef" class="ui-split-pane" :class="direction" :style="paneStyle">
    <section class="ui-split-pane__pane" :class="firstPaneClass"><slot name="first" /></section>
    <button class="ui-split-pane__handle" type="button" aria-label="Resize pane" @pointerdown="startResize" />
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
    max?: number
    min?: number
    modelValue: number
    secondPaneClass?: PaneClass
  }>(),
  {direction: 'horizontal', max: 80, min: 20},
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'resize-end': [value: number]
}>()

const rootRef = ref<HTMLElement | null>(null)
const paneStyle = computed(() => ({'--split-size': `${props.modelValue}%`}))

function startResize(event: PointerEvent) {
  const root = rootRef.value
  if (!root) return
  event.preventDefault()
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
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
    emit('resize-end', nextValue)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}

function clamp(value: number) {
  return Math.min(props.max, Math.max(props.min, Math.round(value)))
}
</script>
