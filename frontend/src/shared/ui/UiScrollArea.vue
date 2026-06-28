<template>
  <div ref="rootRef" class="ui-scroll-area" :class="{'ui-scroll-area--x': canScrollX, 'ui-scroll-area--y': canScrollY, 'ui-scroll-area--dragging': dragState}">
    <div ref="viewportRef" class="ui-scroll-area__viewport" @scroll.capture="syncScrollState">
      <slot />
    </div>
    <button
      v-if="canScrollY"
      class="ui-scroll-area__thumb ui-scroll-area__thumb--y"
      type="button"
      aria-label="Scroll vertically"
      :style="verticalThumbStyle"
      @click.stop
      @pointerdown.stop="startDrag('y', $event)"
    />
    <button
      v-if="canScrollX"
      class="ui-scroll-area__thumb ui-scroll-area__thumb--x"
      type="button"
      aria-label="Scroll horizontally"
      :style="horizontalThumbStyle"
      @click.stop
      @pointerdown.stop="startDrag('x', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref} from 'vue'

const props = withDefaults(defineProps<{axis?: 'both' | 'x' | 'y'}>(), {axis: 'both'})
const rootRef = ref<HTMLElement | null>(null)
const viewportRef = ref<HTMLElement | null>(null)
const viewportWidth = ref(0)
const viewportHeight = ref(0)
const scrollWidth = ref(0)
const scrollHeight = ref(0)
const scrollLeft = ref(0)
const scrollTop = ref(0)
const dragState = ref<{axis: 'x' | 'y'; pointerStart: number; scrollStart: number} | null>(null)
let resizeObserver: ResizeObserver | null = null
let mutationObserver: MutationObserver | null = null

const canScrollX = computed(() => props.axis !== 'y' && scrollWidth.value > viewportWidth.value + 1)
const canScrollY = computed(() => props.axis !== 'x' && scrollHeight.value > viewportHeight.value + 1)
const verticalOffset = ref(0)
const verticalBottom = ref(0)
const verticalTrackSize = computed(() => Math.max(0, viewportHeight.value - verticalOffset.value - (canScrollX.value ? verticalBottom.value : 0)))
const horizontalTrackSize = computed(() => Math.max(0, viewportWidth.value - (canScrollY.value ? 10 : 0)))
const verticalThumbSize = computed(() => getThumbSize(viewportHeight.value, scrollHeight.value, verticalTrackSize.value))
const horizontalThumbSize = computed(() => getThumbSize(viewportWidth.value, scrollWidth.value, horizontalTrackSize.value))
const verticalThumbOffset = computed(() => getThumbOffset(scrollTop.value, scrollHeight.value - viewportHeight.value, verticalTrackSize.value - verticalThumbSize.value))
const horizontalThumbOffset = computed(() => getThumbOffset(scrollLeft.value, scrollWidth.value - viewportWidth.value, horizontalTrackSize.value - horizontalThumbSize.value))
const verticalThumbStyle = computed(() => ({height: `${verticalThumbSize.value}px`, transform: `translateY(${verticalThumbOffset.value}px)`}))
const horizontalThumbStyle = computed(() => ({width: `${horizontalThumbSize.value}px`, transform: `translateX(${horizontalThumbOffset.value}px)`}))

onMounted(() => {
  resizeObserver = new ResizeObserver(updateMetrics)
  if (viewportRef.value) resizeObserver.observe(viewportRef.value)
  if (viewportRef.value?.firstElementChild) resizeObserver.observe(viewportRef.value.firstElementChild)
  const nestedScroller = viewportRef.value?.querySelector<HTMLElement>('.ui-virtual-list, .ui-data-grid')
  const virtualSpacer = viewportRef.value?.querySelector<HTMLElement>('.ui-virtual-list__spacer')
  if (nestedScroller) resizeObserver.observe(nestedScroller)
  if (virtualSpacer) resizeObserver.observe(virtualSpacer)
  mutationObserver = new MutationObserver(() => nextTick(updateMetrics))
  if (viewportRef.value) mutationObserver.observe(viewportRef.value, {attributes: true, childList: true, subtree: true})
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', stopDrag)
  nextTick(() => {
    updateMetrics()
    window.requestAnimationFrame(updateMetrics)
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  mutationObserver?.disconnect()
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', stopDrag)
})

function syncScrollState() {
  updateMetrics()
}

function updateMetrics() {
  const viewport = viewportRef.value
  if (!viewport) return
  const verticalScroller = viewport.querySelector<HTMLElement>('.ui-virtual-list')
  const virtualSpacer = verticalScroller?.querySelector<HTMLElement>('.ui-virtual-list__spacer')
  const virtualScrollHeight = Number(virtualSpacer?.dataset.scrollHeight ?? 0)
  const rootStyle = rootRef.value ? window.getComputedStyle(rootRef.value) : null
  verticalOffset.value = Number.parseFloat(rootStyle?.getPropertyValue('--ui-scroll-area-y-offset') || '0') || 0
  verticalBottom.value = Number.parseFloat(rootStyle?.getPropertyValue('--ui-scroll-area-y-bottom') || '10') || 10
  viewportWidth.value = viewport.clientWidth
  viewportHeight.value = viewport.clientHeight
  scrollWidth.value = viewport.scrollWidth
  scrollHeight.value = Math.max(viewport.scrollHeight, verticalScroller?.scrollHeight ?? 0, virtualScrollHeight)
  scrollLeft.value = viewport.scrollLeft
  scrollTop.value = verticalScroller?.scrollTop ?? viewport.scrollTop
}

function getThumbSize(viewportSize: number, contentSize: number, trackSize: number) {
  if (contentSize <= 0 || trackSize <= 0) return 0
  return Math.max(24, Math.min(trackSize, (viewportSize / contentSize) * trackSize))
}

function getThumbOffset(scrollPosition: number, maxScroll: number, maxOffset: number) {
  if (maxScroll <= 0 || maxOffset <= 0) return 0
  return clamp((scrollPosition / maxScroll) * maxOffset, 0, maxOffset)
}

function startDrag(axis: 'x' | 'y', event: PointerEvent) {
  event.preventDefault()
  event.stopPropagation()
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  const scrollTarget = getScrollTarget(axis)
  dragState.value = {axis, pointerStart: axis === 'x' ? event.clientX : event.clientY, scrollStart: axis === 'x' ? scrollTarget.scrollLeft : scrollTarget.scrollTop}
}

function handlePointerMove(event: PointerEvent) {
  const viewport = viewportRef.value
  const state = dragState.value
  if (!viewport || !state) return
  const scrollTarget = getScrollTarget(state.axis)
  const trackSize = state.axis === 'x' ? horizontalTrackSize.value : verticalTrackSize.value
  const thumbSize = state.axis === 'x' ? horizontalThumbSize.value : verticalThumbSize.value
  const maxScroll = state.axis === 'x' ? scrollWidth.value - viewportWidth.value : scrollHeight.value - viewportHeight.value
  const maxOffset = trackSize - thumbSize
  if (maxOffset <= 0 || maxScroll <= 0) return
  const pointerPosition = state.axis === 'x' ? event.clientX : event.clientY
  const delta = pointerPosition - state.pointerStart
  const nextScroll = clamp(state.scrollStart + (delta / maxOffset) * maxScroll, 0, maxScroll)
  if (state.axis === 'x') scrollTarget.scrollLeft = nextScroll
  else scrollTarget.scrollTop = nextScroll
}

function getScrollTarget(axis: 'x' | 'y') {
  const viewport = viewportRef.value!
  if (axis === 'x') return viewport
  return viewport.querySelector<HTMLElement>('.ui-virtual-list') ?? viewport
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function stopDrag() {
  dragState.value = null
}
</script>
