<template>
  <article :class="['task-item', 'ui-row', `task-item--${task.status}`, {'is-danger': task.status === 'failed'}]">
    <div class="task-item__state" aria-hidden="true" />
    <div class="task-item__main">
      <header class="task-item__header">
        <strong>{{ task.title }}</strong>
        <small>{{ task.detail }}</small>
      </header>
      <p v-if="task.error && errorExpanded" class="task-item__error">{{ task.error }}</p>
      <div class="task-item__progress">
        <progress :value="task.progress" max="100" :aria-label="messages.task.progressLabel(task.title)" />
        <small>{{ task.progress }}%</small>
      </div>
    </div>
    <aside class="task-item__meta">
      <UiStatusBadge :status="task.status" />
      <div class="task-item__actions">
        <button v-if="task.status === 'running'" type="button" @click="cancelTask(task)">{{ messages.task.actions.cancel }}</button>
        <button v-if="task.status === 'failed' || task.status === 'cancelled'" type="button" @click="retryTask(task)">{{ messages.task.actions.retry }}</button>
        <button v-if="task.error" type="button" @click="errorExpanded = !errorExpanded">{{ errorExpanded ? messages.task.actions.hideError : messages.task.actions.showError }}</button>
        <button v-if="task.error" type="button" @click="copyError">{{ messages.task.actions.copyError }}</button>
      </div>
    </aside>
  </article>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import type {TaskItem} from '../../../entities/task'
import {cancelTask, retryTask} from '../../../features/task/manage-task/manageTask'
import {messages} from '../../../shared/copy'
import {UiStatusBadge} from '../../../shared/ui'

const props = defineProps<{task: TaskItem}>()
const errorExpanded = ref(false)

async function copyError() {
  if (!props.task.error) return
  await navigator.clipboard?.writeText(props.task.error)
}
</script>
