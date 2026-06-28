<template>
  <section class="task-detail-panel" aria-label="Task detail">
    <header><div><strong>Task Detail</strong><small>{{ task?.title ?? 'No task selected' }}</small></div></header>
    <div v-if="task" class="task-detail-panel__content"><dl><div><dt>Status</dt><dd>{{ task.status }}</dd></div><div><dt>Progress</dt><dd>{{ task.progress }}%</dd></div><div><dt>Detail</dt><dd>{{ task.detail }}</dd></div></dl><progress :value="task.progress" max="100" /></div>
    <EmptyState v-else compact icon="TASK" title="No task selected" description="Open Task Queue and select a background job to inspect details." />
  </section>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import {taskItems} from '../../../entities/task'
import {EmptyState} from '../../../shared/ui'
const task = computed(() => taskItems[0] ?? null)
</script>
