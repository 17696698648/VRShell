<template>
  <div v-if="visibleTasks.length > 0" class="task-mini-panel" :aria-label="messages.sftp.taskMiniPanel.label">
    <header>
      <strong>{{ messages.sftp.taskMiniPanel.title }}</strong>
      <button type="button" @click="executeCommand('workspace.openTasksPanel')">{{ messages.sftp.taskMiniPanel.openTaskCenter }}</button>
    </header>
    <article v-for="task in visibleTasks" :key="task.id" :class="['task-mini-panel__item', `task-mini-panel__item--${task.status}`]">
      <div>
        <strong>{{ task.title }}</strong>
        <small>{{ task.detail }}</small>
      </div>
      <span>{{ task.progress }}%</span>
      <progress :value="task.progress" max="100" />
    </article>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {taskItems} from '../../../entities/task'
import {executeCommand} from '../../../shared/command'
import {messages} from '../../../shared/copy'

const visibleTasks = computed(() => taskItems.filter((task) => task.id.startsWith('sftp-') || /upload|download/i.test(task.title)).slice(0, 3))
</script>
