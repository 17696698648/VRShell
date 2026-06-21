<template>
  <div class="task-list">
    <TaskListItem v-for="task in tasks" :key="task.id" :task="task" />
  </div>
</template>

<script setup lang="ts">
import type {TaskItem} from '../../../entities/task'
import TaskListItem from './TaskListItem.vue'

defineProps<{tasks: TaskItem[]}>()
</script>
