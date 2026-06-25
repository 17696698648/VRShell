import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/** SFTP task status */
export type SftpTaskStatus = 'running' | 'done' | 'failed' | 'cancelled'

/** SFTP transfer task snapshot */
export interface SftpTask {
  taskId: string
  kind: string
  title: string
  detail: string
  status: SftpTaskStatus
  transferredBytes: number
  totalBytes: number | null
  bytesPerSecond: number | null
  error: string | null
  updatedAtMs: number
}

export const useSftpTaskStore = defineStore('sftpTask', () => {
  /** All SFTP tasks keyed by task id */
  const tasks = ref<Map<string, SftpTask>>(new Map())

  /** List of all tasks, sorted by most recent first */
  const taskList = computed(() =>
    Array.from(tasks.value.values()).sort(
      (a, b) => b.updatedAtMs - a.updatedAtMs
    )
  )

  /** Currently running tasks */
  const runningTasks = computed(() =>
    taskList.value.filter((t) => t.status === 'running')
  )

  /** Update or add a task from progress event */
  function upsertTask(task: SftpTask) {
    tasks.value.set(task.taskId, task)
  }

  /** Update task progress */
  function updateProgress(
    taskId: string,
    transferredBytes: number,
    totalBytes: number | null,
    bytesPerSecond: number | null
  ) {
    const existing = tasks.value.get(taskId)
    if (existing) {
      tasks.value.set(taskId, {
        ...existing,
        transferredBytes,
        totalBytes,
        bytesPerSecond,
        updatedAtMs: Date.now(),
      })
    }
  }

  /** Mark a task as completed */
  function markDone(taskId: string) {
    const existing = tasks.value.get(taskId)
    if (existing) {
      tasks.value.set(taskId, {
        ...existing,
        status: 'done',
        updatedAtMs: Date.now(),
      })
    }
  }

  /** Mark a task as failed */
  function markFailed(taskId: string, error: string) {
    const existing = tasks.value.get(taskId)
    if (existing) {
      tasks.value.set(taskId, {
        ...existing,
        status: 'failed',
        error,
        updatedAtMs: Date.now(),
      })
    }
  }

  /** Remove a task */
  function removeTask(taskId: string) {
    tasks.value.delete(taskId)
  }

  /** Replace all tasks from a snapshot list */
  function setTasks(snapshotList: SftpTask[]) {
    tasks.value.clear()
    for (const task of snapshotList) {
      tasks.value.set(task.taskId, task)
    }
  }

  return {
    tasks,
    taskList,
    runningTasks,
    upsertTask,
    updateProgress,
    markDone,
    markFailed,
    removeTask,
    setTasks,
  }
})
