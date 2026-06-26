<template>
  <div ref="rootRef" class="ui-virtual-list" :style="{height}" @scroll="onScroll">
    <div class="ui-virtual-list__spacer" :style="{height: `${totalHeight}px`}" :data-scroll-height="totalHeight">
      <div class="ui-virtual-list__window" :style="{transform: `translateY(${offsetY}px)`}">
        <div v-for="item in visibleItems" :key="getKey(item.item, item.index)" class="ui-virtual-list__item" :style="{height: `${itemHeight}px`}">
          <slot :item="item.item" :index="item.index" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import {computed, ref} from 'vue'

const props = withDefaults(
  defineProps<{
    getKey?: (item: T, index: number) => string
    height?: string
    itemHeight: number
    items: T[]
    overscan?: number
  }>(),
  {height: '100%', overscan: 4},
)

const rootRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)

const totalHeight = computed(() => props.items.length * props.itemHeight)
const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan))
const visibleCount = computed(() => {
  const viewportHeight = rootRef.value?.clientHeight ?? 0
  return Math.ceil(viewportHeight / props.itemHeight) + props.overscan * 2
})
const visibleItems = computed(() =>
  props.items.slice(startIndex.value, startIndex.value + visibleCount.value).map((item, offset) => ({item, index: startIndex.value + offset})),
)
const offsetY = computed(() => startIndex.value * props.itemHeight)

function onScroll(event: Event) {
  scrollTop.value = (event.target as HTMLElement).scrollTop
}

function getKey(item: T, index: number) {
  return props.getKey?.(item, index) ?? String(index)
}
</script>
