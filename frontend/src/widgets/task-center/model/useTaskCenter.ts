import {taskItems} from '../../../entities/task'

export function useTaskCenter() {
  return {tasks: taskItems}
}
