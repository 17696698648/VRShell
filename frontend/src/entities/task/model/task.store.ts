import {reactive} from 'vue'

export interface TaskItem {
  id: string
  title: string
  detail: string
  progress: number
  status: 'running' | 'done' | 'failed' | 'cancelled'
}

export const taskItems = reactive<TaskItem[]>([])

export function addTask(task: TaskItem) {
  taskItems.unshift(task)
}

export function patchTask(taskId: string, patch: Partial<TaskItem>) {
  const task = taskItems.find((item) => item.id === taskId)
  if (task) Object.assign(task, patch)
}
