<template>
  <div class="task-list">
    <UiVirtualList :items="tasks" :item-height="92" :get-key="(task) => task.id">
      <template #default="{item}">
        <TaskListItem :task="item" />
      </template>
    </UiVirtualList>
  </div>
</template>

<script setup lang="ts">
import type {TaskItem} from '../../../entities/task'
import {UiVirtualList} from '../../../shared/ui'
import TaskListItem from './TaskListItem.vue'

defineProps<{tasks: TaskItem[]}>()
</script>
