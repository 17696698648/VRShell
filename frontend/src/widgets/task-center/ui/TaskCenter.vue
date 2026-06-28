<template>
  <UiPanel class="task-center" :compact="compact">
    <UiToolbar label="Task queue actions">
      <template #leading>
        <div class="task-center__title">
          <strong>Task Queue</strong>
          <small>{{ summaryLabel }}</small>
        </div>
      </template>
      <template #actions>
        <button class="task-center__clear" type="button" :disabled="settledCount === 0" @click="clearSettledTasks">Clear completed</button>
      </template>
    </UiToolbar>
    <div v-if="tasks.length > 0" class="task-center__groups">
      <TaskList title="Running" :tasks="runningTasks" empty-label="No active jobs" />
      <TaskList title="Needs attention" :tasks="failedTasks" empty-label="No failed jobs" />
      <TaskList title="Completed" :tasks="settledTasks" empty-label="No completed jobs" />
    </div>
    <div v-else class="task-center__empty">
      <strong>No background jobs</strong>
      <span>SFTP transfers and long-running operations will appear here.</span>
    </div>
  </UiPanel>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {clearSettledTasks} from '../../../entities/task'
import {UiPanel, UiToolbar} from '../../../shared/ui'
import {useTaskCenter} from '../model/useTaskCenter'
import TaskList from './TaskList.vue'

defineProps<{compact?: boolean}>()
const {tasks} = useTaskCenter()

const runningTasks = computed(() => tasks.filter((task) => task.status === 'running'))
const failedTasks = computed(() => tasks.filter((task) => task.status === 'failed'))
const settledTasks = computed(() => tasks.filter((task) => task.status === 'done' || task.status === 'cancelled'))
const settledCount = computed(() => settledTasks.value.length)
const summaryLabel = computed(() => `${runningTasks.value.length} running · ${failedTasks.value.length} failed · ${settledTasks.value.length} completed`)
</script>
