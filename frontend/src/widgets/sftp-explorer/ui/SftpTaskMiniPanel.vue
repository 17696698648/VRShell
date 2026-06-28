<template>
  <div v-if="visibleTasks.length > 0" class="task-mini-panel" :aria-label="messages.sftp.taskMiniPanel.label">
    <header class="task-mini-panel__header">
      <div>
        <strong>{{ messages.sftp.taskMiniPanel.title }}</strong>
        <small>{{ summaryLabel }}</small>
      </div>
      <button type="button" @click="executeCommand('workspace.openTasksPanel')">{{ messages.sftp.taskMiniPanel.openTaskCenter }}</button>
    </header>
    <article v-for="task in visibleTasks" :key="task.id" :class="['task-mini-panel__item', `task-mini-panel__item--${task.status}`]">
      <span class="task-mini-panel__state" aria-hidden="true" />
      <div class="task-mini-panel__main">
        <div class="task-mini-panel__title-row">
          <strong>{{ task.title }}</strong>
          <span>{{ task.progress }}%</span>
        </div>
        <small>{{ task.detail }}</small>
        <progress :value="task.progress" max="100" :aria-label="messages.task.progressLabel(task.title)" />
      </div>
      <div class="task-mini-panel__actions">
        <button v-if="task.status === 'running'" type="button" @click="cancelTask(task)">{{ messages.task.actions.cancel }}</button>
        <button v-if="task.status === 'failed' || task.status === 'cancelled'" type="button" @click="retryTask(task)">{{ messages.task.actions.retry }}</button>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {taskItems} from '../../../entities/task'
import {cancelTask, retryTask} from '../../../features/task/manage-task/manageTask'
import {executeCommand} from '../../../shared/command'
import {messages} from '../../../shared/copy'

const sftpTasks = computed(() => taskItems.filter((task) => task.id.startsWith('sftp-') || /upload|download/i.test(task.title)))
const visibleTasks = computed(() => sftpTasks.value.slice(0, 3))
const summaryLabel = computed(() => {
  const running = sftpTasks.value.filter((task) => task.status === 'running').length
  const failed = sftpTasks.value.filter((task) => task.status === 'failed').length
  if (failed > 0) return `${failed} need attention · ${running} running`
  return `${running} running · ${sftpTasks.value.length} recent`
})
</script>
