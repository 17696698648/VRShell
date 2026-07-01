import {reactive} from 'vue'

export interface TaskItem {
  id: string
  kind?: string
  title: string
  detail: string
  error?: string
  progress: number
  status: 'running' | 'done' | 'failed' | 'cancelled'
  traceId?: string
}

export const taskItems = reactive<TaskItem[]>([])

export function addTask(task: TaskItem) {
  taskItems.unshift(task)
}

export function upsertTask(task: TaskItem) {
  const existingTask = taskItems.find((item) => item.id === task.id)
  if (existingTask) {
    Object.assign(existingTask, task)
    return existingTask
  }
  addTask(task)
  return task
}

export function patchTask(taskId: string, patch: Partial<TaskItem>) {
  const task = taskItems.find((item) => item.id === taskId)
  if (task) Object.assign(task, patch)
}

export function clearSettledTasks() {
  for (let index = taskItems.length - 1; index >= 0; index -= 1) {
    const task = taskItems[index]
    if (task.status === 'done' || task.status === 'cancelled') taskItems.splice(index, 1)
  }
}
