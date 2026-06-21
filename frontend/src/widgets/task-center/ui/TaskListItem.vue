<template>
  <article class="task-item" :class="`task-item--${task.status}`">
    <header class="task-item__header">
      <strong>{{ task.title }}</strong>
      <UiBadge :intent="badgeIntent">{{ task.status }}</UiBadge>
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
import {computed} from 'vue'
import type {TaskItem} from '../../../entities/task'
import {cancelTask, retryTask} from '../../../features/task/manage-task/manageTask'
import {UiBadge} from '../../../shared/ui'

const props = defineProps<{task: TaskItem}>()
const badgeIntent = computed(() => {
  if (props.task.status === 'failed' || props.task.status === 'cancelled') return 'danger'
  if (props.task.status === 'running') return 'info'
  return 'success'
})
</script>
