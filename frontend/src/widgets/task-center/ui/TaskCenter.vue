<template>
  <UiPanel class="task-center" :compact="compact">
    <UiToolbar label="Task queue actions">
      <template #leading>
        <div class="task-center__title">
          <strong>Task Queue</strong>
          <small>{{ summaryLabel }}</small>
        </div>
      </template>
      <template #trailing>
        <button class="task-center__clear" type="button" :disabled="settledCount === 0" @click="clearSettledTasks">Clear completed</button>
      </template>
    </UiToolbar>
    <div v-if="tasks.length > 0" class="task-center__list">
      <TaskList :tasks="tasks" />
    </div>
    <div v-else class="task-center__empty">
      <strong>No background jobs</strong>
      <span>SFTP transfers and long-running operations will appear here.</span>
    </div>
  </UiPanel>
</template>

<script setup lang="ts">
import {clearSettledTasks} from '../../../entities/task'
import {UiPanel, UiToolbar} from '../../../shared/ui'
import {useTaskCenter} from '../model/useTaskCenter'
import {useTaskCenterSummary} from '../model/useTaskCenterSummary'
import TaskList from './TaskList.vue'

defineProps<{compact?: boolean}>()
const {tasks} = useTaskCenter()
const {settledCount, summaryLabel} = useTaskCenterSummary(tasks)
</script>
