<template>
  <article :class="['task-item', `task-item--${task.status}`, {'is-danger': task.status === 'failed'}]">
    <span class="task-item__state" aria-hidden="true" />
    <strong class="task-item__title">{{ task.title }}</strong>
    <small class="task-item__detail">{{ task.detail }}</small>
    <div class="task-item__progress">
      <progress :value="task.progress" max="100" :aria-label="messages.task.progressLabel(task.title)" />
      <small>{{ task.progress }}%</small>
    </div>
    <UiStatusBadge :status="task.status" />
    <div class="task-item__actions">
      <button v-if="task.status === 'running'" type="button" @click="cancelTask(task)">{{ messages.task.actions.cancel }}</button>
      <span v-if="task.status === 'failed' || task.status === 'cancelled'" class="task-item__action-note">{{ messages.task.actions.retryUnavailable }}</span>
      <button v-if="task.error" type="button" @click="errorExpanded = !errorExpanded">{{ errorExpanded ? messages.task.actions.hideError : messages.task.actions.showError }}</button>
      <button v-if="task.error" type="button" @click="copyError">{{ messages.task.actions.copyError }}</button>
      <button v-if="task.error" type="button" @click="openLogsPanel">{{ messages.task.actions.openLogs }}</button>
    </div>
    <p v-if="task.error && errorExpanded" class="task-item__error">{{ task.error }}</p>
  </article>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import type {TaskItem} from '../../../entities/task'
import {cancelTask} from '../../../features/task/manage-task/manageTask'
import {openLogsPanel} from '../../../features/workspace/open-logs-panel'
import {messages} from '../../../shared/copy'
import {notifyFeedback} from '../../../shared/feedback'
import {UiStatusBadge} from '../../../shared/ui'

const props = defineProps<{task: TaskItem}>()
const errorExpanded = ref(false)

async function copyError() {
  if (!props.task.error) return
  await navigator.clipboard?.writeText(props.task.error)
  notifyFeedback({level: 'success', title: 'Copied task error', detail: props.task.title})
}
</script>
