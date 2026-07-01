<template>
  <article :class="['task-item', `task-item--${task.status}`, {'is-danger': task.status === 'failed'}]" :aria-label="`${task.title}: ${task.status}`" aria-live="polite" role="listitem">
    <span class="task-item__state" aria-hidden="true" />
    <strong class="task-item__title">{{ task.title }}</strong>
    <small class="task-item__detail">{{ task.detail }}</small>
    <div class="task-item__progress">
      <progress :value="task.progress" max="100" :aria-label="messages.task.progressLabel(task.title)" />
      <small>{{ task.progress }}%</small>
    </div>
    <UiStatusBadge :status="task.status" />
    <div class="task-item__actions">
      <UiButton v-if="task.status === 'running'" size="sm" variant="secondary" @click="cancelTask(task)">{{ messages.task.actions.cancel }}</UiButton>
      <UiButton v-else-if="canRetry" size="sm" variant="secondary" @click="retryTask(task)">{{ messages.task.actions.retry }}</UiButton>
      <span v-else-if="task.status === 'failed' || task.status === 'cancelled'" class="task-item__action-note">{{ messages.task.actions.retryUnavailable }}</span>
      <UiButton v-if="task.error" size="sm" variant="ghost" :aria-expanded="errorExpanded" @click="errorExpanded = !errorExpanded">{{ errorExpanded ? messages.task.actions.hideError : messages.task.actions.showError }}</UiButton>
      <UiButton v-if="task.error" size="sm" variant="ghost" @click="copyError">{{ messages.task.actions.copyError }}</UiButton>
      <UiButton v-if="task.error" size="sm" variant="ghost" @click="openLogsPanel">{{ messages.task.actions.openLogs }}</UiButton>
    </div>
    <p v-if="task.error && errorExpanded" class="task-item__error">
      {{ task.error }}
      <small v-if="task.traceId">Trace ID: {{ task.traceId }}</small>
    </p>
  </article>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import type {TaskItem} from '../../../entities/task'
import {cancelTask, retryTask} from '../../../features/task/manage-task/manageTask'
import {openLogsPanel} from '../../../features/workspace/open-logs-panel'
import {messages} from '../../../shared/copy'
import {notifyFeedback} from '../../../shared/feedback'
import {UiButton, UiStatusBadge} from '../../../shared/ui'

const props = defineProps<{task: TaskItem}>()
const errorExpanded = ref(false)
const canRetry = computed(() => (props.task.status === 'failed' || props.task.status === 'cancelled') && Boolean(props.task.retryContext))

async function copyError() {
  if (!props.task.error) return
  await navigator.clipboard?.writeText(props.task.traceId ? `${props.task.error}\nTrace ID: ${props.task.traceId}` : props.task.error)
  notifyFeedback({level: 'success', title: 'Copied task error', detail: props.task.title})
}
</script>
