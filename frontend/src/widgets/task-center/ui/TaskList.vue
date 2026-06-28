<template>
  <section class="task-list">
    <header class="task-list__header">
      <strong>{{ title }}</strong>
      <span>{{ tasks.length }}</span>
    </header>
    <UiVirtualList v-if="tasks.length > 0" :items="tasks" :item-height="72" :get-key="(task) => task.id">
      <template #default="{item}">
        <TaskListItem :task="item" />
      </template>
    </UiVirtualList>
    <div v-else class="task-list__empty">{{ emptyLabel }}</div>
  </section>
</template>

<script setup lang="ts">
import type {TaskItem} from '../../../entities/task'
import {UiVirtualList} from '../../../shared/ui'
import TaskListItem from './TaskListItem.vue'

defineProps<{emptyLabel: string; tasks: TaskItem[]; title: string}>()
</script>
