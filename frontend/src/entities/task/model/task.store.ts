import {reactive} from 'vue'

export interface TaskItem {
  id: string
  title: string
  detail: string
  error?: string
  progress: number
  status: 'running' | 'done' | 'failed' | 'cancelled'
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
