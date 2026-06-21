<template>
  <aside class="activity-bar">
    <button
      v-for="item in items"
      :key="item.id"
      :class="['activity-bar__item', {active: workspaceState.activePanel === item.id}]"
      :title="item.command.shortcut ? `${item.command.title} (${item.command.shortcut})` : item.command.title"
      :aria-label="item.command.title"
      @click="executeCommand(item.command.id)"
    >
      <span aria-hidden="true">{{ item.icon }}</span>
      <small>{{ item.command.title }}</small>
      <span
        v-if="badges[item.id]"
        :class="['activity-bar__badge', `activity-bar__badge--${badges[item.id]?.intent}`]"
        :title="badges[item.id]?.title"
      >
        {{ formatActivityBarBadge(badges[item.id]?.count ?? 0) }}
      </span>
    </button>
  </aside>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {workspaceState} from '../../entities/workspace'
import {executeCommand, getCommand} from '../../features/workspace/command-registry'
import {formatActivityBarBadge, useActivityBarBadges} from './model/activityBarBadges'
import {activityBarItems} from './model/activityBarItems'

const badges = useActivityBarBadges()

const items = computed(() =>
  activityBarItems.flatMap((item) => {
    const command = getCommand(item.commandId)
    return command ? [{...item, command}] : []
  }),
)
</script>
