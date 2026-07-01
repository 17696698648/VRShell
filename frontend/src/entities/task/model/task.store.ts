import {reactive} from 'vue'

export interface TaskItem {
  id: string
  kind?: string
  action?: string
  title: string
  detail: string
  error?: string
  path?: string
  progress: number
  retryContext?: Record<string, unknown>
  status: 'running' | 'done' | 'failed' | 'cancelled'
  traceId?: string
}

export const taskItems = reactive<TaskItem[]>([])
const taskIndexById = new Map<string, TaskItem>()

export function addTask(task: TaskItem) {
  taskItems.unshift(task)
  taskIndexById.set(task.id, task)
}

export function upsertTask(task: TaskItem) {
  const existingTask = findTask(task.id)
  if (existingTask) {
    Object.assign(existingTask, task)
    return existingTask
  }
  addTask(task)
  return task
}

export function patchTask(taskId: string, patch: Partial<TaskItem>) {
  const task = findTask(taskId)
  if (task) Object.assign(task, patch)
}

export function clearSettledTasks() {
  for (let index = taskItems.length - 1; index >= 0; index -= 1) {
    const task = taskItems[index]
    if (task.status === 'done' || task.status === 'cancelled') {
      taskIndexById.delete(task.id)
      taskItems.splice(index, 1)
    }
  }
}

export function rebuildTaskIndex() {
  taskIndexById.clear()
  for (const task of taskItems) taskIndexById.set(task.id, task)
}

function findTask(taskId: string) {
  const indexedTask = taskIndexById.get(taskId)
  if (indexedTask && taskItems.includes(indexedTask)) return indexedTask
  rebuildTaskIndex()
  return taskIndexById.get(taskId) ?? null
}
