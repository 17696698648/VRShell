<template>
  <footer class="status-bar">
    <div class="status-bar__group">
      <button
        v-for="item in leftItems"
        :key="item.id"
        :class="['status-bar__item', `status-bar__item--${item.intent ?? 'neutral'}`]"
        :title="item.title"
        type="button"
        @click="item.onClick?.()"
      >
        <span v-if="item.icon" aria-hidden="true">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </button>
    </div>
    <div class="status-bar__group status-bar__group--right">
      <button
        v-for="item in rightItems"
        :key="item.id"
        :class="['status-bar__item', `status-bar__item--${item.intent ?? 'neutral'}`]"
        :title="item.title"
        type="button"
        @click="item.onClick?.()"
      >
        <span v-if="item.icon" aria-hidden="true">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
import {useStatusBarItems} from './model/statusItemRegistry'

const leftItems = useStatusBarItems('left')
const rightItems = useStatusBarItems('right')
</script>
