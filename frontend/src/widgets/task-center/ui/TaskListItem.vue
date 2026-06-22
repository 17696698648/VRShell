<template>
  <article class="task-item" :class="`task-item--${task.status}`">
    <header class="task-item__header">
      <strong>{{ task.title }}</strong>
      <UiStatusBadge :status="task.status" />
    </header>
    <small>{{ task.detail }}</small>
    <div class="task-item__progress">
      <progress :value="task.progress" max="100" :aria-label="`${task.title} progress`" />
      <small>{{ task.progress }}%</small>
    </div>
    <div class="task-item__actions">
      <button v-if="task.status === 'running'" type="button" @click="cancelTask(task)">Cancel</button>
      <button v-if="task.status === 'failed' || task.status === 'cancelled'" type="button" @click="retryTask(task)">Retry</button>
    </div>
  </article>
</template>

<script setup lang="ts">
import type {TaskItem} from '../../../entities/task'
import {cancelTask, retryTask} from '../../../features/task/manage-task/manageTask'
import {UiStatusBadge} from '../../../shared/ui'

defineProps<{task: TaskItem}>()
</script>
