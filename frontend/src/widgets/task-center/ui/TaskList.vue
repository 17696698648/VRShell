<template>
  <section class="task-list">
    <header class="task-list__header" aria-hidden="true">
      <span />
      <span>Task</span>
      <span>Detail</span>
      <span>Progress</span>
      <span>Status</span>
      <span>Actions</span>
    </header>
    <TaskListItem v-for="task in tasks" :key="task.id" :task="task" />
  </section>
</template>

<script setup lang="ts">
import type {TaskItem} from '../../../entities/task'
import TaskListItem from './TaskListItem.vue'

defineProps<{tasks: TaskItem[]}>()
</script>
