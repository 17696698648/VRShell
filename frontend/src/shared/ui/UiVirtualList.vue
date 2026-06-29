<template>
  <div class="ui-virtual-list-shell" :class="{'ui-virtual-list-shell--custom-scrollbar': customScrollbar, 'ui-virtual-list-shell--dragging': dragState}">
    <div ref="rootRef" class="ui-virtual-list" :style="{height}" @scroll="onScroll">
      <div class="ui-virtual-list__spacer" :style="{height: `${totalHeight}px`}" :data-scroll-height="totalHeight">
        <div class="ui-virtual-list__window" :style="{transform: `translateY(${offsetY}px)`}">
          <div v-for="item in visibleItems" :key="getKey(item.item, item.index)" class="ui-virtual-list__item" :style="{height: `${itemHeight}px`}">
            <slot :item="item.item" :index="item.index" />
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="customScrollbar && canScrollY"
      ref="scrollbarRef"
      class="ui-virtual-list__scrollbar ui-virtual-list__scrollbar--y"
      aria-hidden="true"
      @pointerdown.prevent="onScrollbarPointerDown"
    >
      <div class="ui-virtual-list__scrollbar-thumb" :style="thumbStyle" @pointerdown.stop.prevent="onThumbPointerDown"/>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'

const props = withDefaults(
  defineProps<{
    customScrollbar?: boolean
    getKey?: (item: T, index: number) => string
    height?: string
    itemHeight: number
    items: T[]
    overscan?: number
  }>(),
  {customScrollbar: false, height: '100%', overscan: 4},
)

const rootRef = ref<HTMLElement | null>(null)
const scrollbarRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const scrollHeight = ref(0)
const viewportHeight = ref(0)
const scrollbarHeight = ref(0)
const dragState = ref<{pointerStart: number; scrollStart: number} | null>(null)
let resizeObserver: ResizeObserver | null = null

const totalHeight = computed(() => props.items.length * props.itemHeight)
const measuredScrollHeight = computed(() => scrollHeight.value || totalHeight.value)
const maxScrollTop = computed(() => Math.max(0, measuredScrollHeight.value - viewportHeight.value))
const canScrollY = computed(() => maxScrollTop.value > 1)
const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan))
const visibleCount = computed(() => Math.ceil(viewportHeight.value / props.itemHeight) + props.overscan * 2)
const visibleItems = computed(() =>
  props.items.slice(startIndex.value, startIndex.value + visibleCount.value).map((item, offset) => ({item, index: startIndex.value + offset})),
)
const offsetY = computed(() => startIndex.value * props.itemHeight)
const thumbHeight = computed(() => {
  if (!canScrollY.value || measuredScrollHeight.value <= 0) return 0
  return Math.max(24, (viewportHeight.value / measuredScrollHeight.value) * trackHeight.value)
})
const thumbTop = computed(() => {
  if (!canScrollY.value || maxScrollTop.value <= 0) return 0
  return (scrollTop.value / maxScrollTop.value) * Math.max(0, trackHeight.value - thumbHeight.value)
})
const trackHeight = computed(() => scrollbarHeight.value || viewportHeight.value)
const thumbStyle = computed(() => ({height: `${thumbHeight.value}px`, transform: `translateY(${thumbTop.value}px)`}))

onMounted(() => {
  updateViewportMetrics()
  if (!rootRef.value) return
  resizeObserver = new ResizeObserver(updateViewportMetrics)
  resizeObserver.observe(rootRef.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('pointerup', onWindowPointerUp)
})

watch(
  () => props.items.length,
  () => void nextTick(updateViewportMetrics),
)

watch(canScrollY, () => void nextTick(updateViewportMetrics))

function onScroll(event: Event) {
  const root = event.target as HTMLElement
  scrollTop.value = root.scrollTop
  updateScrollMetrics(root)
}

function onScrollbarPointerDown(event: PointerEvent) {
  const root = rootRef.value
  if (!root || !canScrollY.value) return
  const trackRect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const targetTop = event.clientY - trackRect.top - thumbHeight.value / 2
  const scrollRatio = targetTop / Math.max(1, trackHeight.value - thumbHeight.value)
  root.scrollTop = clamp(scrollRatio * maxScrollTop.value, 0, maxScrollTop.value)
}

function onThumbPointerDown(event: PointerEvent) {
  if (!canScrollY.value) return
  dragState.value = {pointerStart: event.clientY, scrollStart: scrollTop.value}
  window.addEventListener('pointermove', onWindowPointerMove)
  window.addEventListener('pointerup', onWindowPointerUp, {once: true})
}

function onWindowPointerMove(event: PointerEvent) {
  const root = rootRef.value
  const state = dragState.value
  if (!root || !state || !canScrollY.value) return
  const trackDistance = Math.max(1, trackHeight.value - thumbHeight.value)
  const scrollDistance = maxScrollTop.value / trackDistance
  root.scrollTop = clamp(state.scrollStart + (event.clientY - state.pointerStart) * scrollDistance, 0, maxScrollTop.value)
}

function onWindowPointerUp() {
  dragState.value = null
  window.removeEventListener('pointermove', onWindowPointerMove)
}

function updateViewportMetrics() {
  const root = rootRef.value
  updateScrollMetrics(root)
  scrollTop.value = root?.scrollTop ?? 0
}

function updateScrollMetrics(root = rootRef.value) {
  viewportHeight.value = root?.clientHeight ?? 0
  scrollHeight.value = root?.scrollHeight ?? totalHeight.value
  updateScrollbarMetrics()
}

function updateScrollbarMetrics() {
  scrollbarHeight.value = scrollbarRef.value?.clientHeight ?? viewportHeight.value
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getKey(item: T, index: number) {
  return props.getKey?.(item, index) ?? String(index)
}
</script>
