<template>
  <UiPanel class="task-center" :compact="compact" title="Tasks" subtitle="Background jobs">
    <TaskList :tasks="tasks" />
  </UiPanel>
</template>

<script setup lang="ts">
import {UiPanel} from '../../../shared/ui'
import {useTaskCenter} from '../model/useTaskCenter'
import TaskList from './TaskList.vue'

defineProps<{compact?: boolean}>()
const {tasks} = useTaskCenter()
</script>
