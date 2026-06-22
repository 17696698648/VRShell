<template>
  <UiPanel class="task-center" :compact="compact">
    <UiToolbar label="Task center actions">
      <template #leading>
        <div class="ui-toolbar__title">
          <strong>Tasks</strong>
          <small>{{ tasks.length }} background jobs</small>
        </div>
      </template>
    </UiToolbar>
    <TaskList :tasks="tasks" />
  </UiPanel>
</template>

<script setup lang="ts">
import {UiPanel, UiToolbar} from '../../../shared/ui'
import {useTaskCenter} from '../model/useTaskCenter'
import TaskList from './TaskList.vue'

defineProps<{compact?: boolean}>()
const {tasks} = useTaskCenter()
</script>
