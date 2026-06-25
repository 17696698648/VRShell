<template>
  <footer class="status-bar">
    <div class="status-bar__group">
      <button
        v-for="item in leftItems"
        :key="item.id"
        :class="['status-bar__item', `status-bar__item--${item.intent ?? 'neutral'}`]"
        :aria-label="item.title ?? item.label"
        :title="tooltipFor(item)"
        type="button"
        @click="item.onClick?.()"
      >
        <component :is="iconFor(item)" v-if="iconFor(item)" :size="14" aria-hidden="true" />
        <span v-else-if="item.icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="status-bar__label status-bar__label--full">{{ item.fullLabel ?? item.label }}</span>
        <span class="status-bar__label status-bar__label--compact">{{ item.compactLabel ?? item.label }}</span>
      </button>
    </div>
    <div class="status-bar__group status-bar__group--center">
      <button
        v-for="item in centerItems"
        :key="item.id"
        :class="['status-bar__item', `status-bar__item--${item.intent ?? 'neutral'}`]"
        :aria-label="item.title ?? item.label"
        :title="tooltipFor(item)"
        type="button"
        @click="item.onClick?.()"
      >
        <component :is="iconFor(item)" v-if="iconFor(item)" :size="14" aria-hidden="true" />
        <span v-else-if="item.icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="status-bar__label status-bar__label--full">{{ item.fullLabel ?? item.label }}</span>
        <span class="status-bar__label status-bar__label--compact">{{ item.compactLabel ?? item.label }}</span>
      </button>
    </div>
    <div class="status-bar__group status-bar__group--right">
      <button
        v-for="item in rightItems"
        :key="item.id"
        :class="['status-bar__item', `status-bar__item--${item.intent ?? 'neutral'}`]"
        :aria-label="item.title ?? item.label"
        :title="tooltipFor(item)"
        type="button"
        @click="item.onClick?.()"
      >
        <component :is="iconFor(item)" v-if="iconFor(item)" :size="14" aria-hidden="true" />
        <span v-else-if="item.icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="status-bar__label status-bar__label--full">{{ item.fullLabel ?? item.label }}</span>
        <span class="status-bar__label status-bar__label--compact">{{ item.compactLabel ?? item.label }}</span>
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
import {Activity, AlertTriangle, CheckCircle2, Clock3, FolderTree, ListTodo, Monitor, Server, Terminal} from '@lucide/vue'
import type {Component} from 'vue'
import type {StatusBarItem} from './model/statusBar.types'
import {useStatusBarItems} from './model/statusItemRegistry'

const leftItems = useStatusBarItems('left')
const centerItems = useStatusBarItems('center')
const rightItems = useStatusBarItems('right')

const icons: Record<string, Component> = {
  activity: Activity,
  alert: AlertTriangle,
  check: CheckCircle2,
  clock: Clock3,
  server: Server,
  sftp: FolderTree,
  tasks: ListTodo,
  terminal: Terminal,
  terminals: Monitor,
}

function iconFor(item: StatusBarItem) {
  return item.iconName ? icons[item.iconName] : undefined
}

function tooltipFor(item: StatusBarItem) {
  return item.tooltip ?? (item.title && item.title !== item.label ? item.title : undefined)
}
</script>
