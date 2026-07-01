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
        <button class="task-center__clear" type="button" @click="copyDiagnostics">Copy diagnostics</button>
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
import {sessionState} from '../../../entities/session'
import {clearSettledTasks, taskItems} from '../../../entities/task'
import {notifyFeedback} from '../../../shared/feedback'
import {exportDiagnosticBundle} from '../../../shared/diagnostics'
import {UiPanel, UiToolbar} from '../../../shared/ui'
import {useTaskCenter} from '../model/useTaskCenter'
import {useTaskCenterSummary} from '../model/useTaskCenterSummary'
import TaskList from './TaskList.vue'

defineProps<{compact?: boolean}>()
const {tasks} = useTaskCenter()
const {settledCount, summaryLabel} = useTaskCenterSummary(tasks)

async function copyDiagnostics() {
  await navigator.clipboard?.writeText(exportDiagnosticBundle({sessions: sessionState.sessions, tasks: taskItems}))
  notifyFeedback({level: 'success', title: 'Copied diagnostics', detail: 'Diagnostic bundle copied to clipboard'})
}
</script>
