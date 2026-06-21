<template>
  <section :class="['panel', 'task-center', {compact}]">
    <header class="panel__header"><div><strong>Tasks</strong><small>Background jobs</small></div></header>
    <TaskList :tasks="tasks" />
  </section>
</template>

<script setup lang="ts">
import {useTaskCenter} from '../model/useTaskCenter'
import TaskList from './TaskList.vue'

defineProps<{compact?: boolean}>()
const {tasks} = useTaskCenter()
</script>
