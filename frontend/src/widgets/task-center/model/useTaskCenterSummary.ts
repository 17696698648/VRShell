import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import type {TaskItem} from '../../../entities/task'

export function useTaskCenterSummary(tasks: MaybeRefOrGetter<TaskItem[]>) {
  const runningTasks = computed(() => toValue(tasks).filter((task) => task.status === 'running'))
  const failedTasks = computed(() => toValue(tasks).filter((task) => task.status === 'failed'))
  const settledTasks = computed(() => toValue(tasks).filter((task) => task.status === 'done' || task.status === 'cancelled'))
  const settledCount = computed(() => settledTasks.value.length)
  const summaryLabel = computed(() => `${runningTasks.value.length} running · ${failedTasks.value.length} failed · ${settledTasks.value.length} completed`)

  return {failedTasks, runningTasks, settledCount, settledTasks, summaryLabel}
}
