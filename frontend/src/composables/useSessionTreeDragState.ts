import {ref} from 'vue'
import type {GroupDropPosition, HostDropPosition} from '../components/SessionTreeGroup.vue'

export function useSessionTreeDragState(isLockedGroup: (groupId: string) => boolean) {
  const draggingGroupId = ref('')
  const dragOverGroupId = ref('')
  const dragOverPosition = ref<GroupDropPosition | ''>('')
  const draggingHostName = ref('')
  const dragOverHostName = ref('')
  const hostDragOverPosition = ref<HostDropPosition | ''>('')

  function startGroupDrag(groupId: string) {
    if (isLockedGroup(groupId)) {
      return
    }

    draggingGroupId.value = groupId
    dragOverGroupId.value = ''
    dragOverPosition.value = ''
  }

  function setGroupDragOver(groupId: string, position: GroupDropPosition) {
    if (groupId === draggingGroupId.value || isLockedGroup(groupId)) {
      return
    }

    dragOverGroupId.value = groupId
    dragOverPosition.value = position
    dragOverHostName.value = ''
    hostDragOverPosition.value = ''
  }

  function clearGroupDragOver(groupId: string) {
    if (dragOverGroupId.value !== groupId) {
      return
    }

    dragOverGroupId.value = ''
    dragOverPosition.value = ''
  }

  function finishGroupDrag() {
    draggingGroupId.value = ''
    dragOverGroupId.value = ''
    dragOverPosition.value = ''
  }

  function startHostDrag(hostName: string) {
    draggingHostName.value = hostName
    dragOverHostName.value = ''
    hostDragOverPosition.value = ''
    dragOverGroupId.value = ''
  }

  function setHostDragOver(hostName: string, position: HostDropPosition) {
    if (hostName === draggingHostName.value) {
      return
    }

    dragOverHostName.value = hostName
    hostDragOverPosition.value = position
    dragOverGroupId.value = ''
  }

  function clearHostDragOver(hostName: string) {
    if (dragOverHostName.value !== hostName) {
      return
    }

    dragOverHostName.value = ''
    hostDragOverPosition.value = ''
  }

  function finishHostDrag() {
    draggingHostName.value = ''
    dragOverHostName.value = ''
    hostDragOverPosition.value = ''
    dragOverGroupId.value = ''
    dragOverPosition.value = ''
  }

  function preventSidebarDragDefault(event: DragEvent) {
    if (draggingGroupId.value || draggingHostName.value) {
      event.preventDefault()
    }
  }

  return {
    clearGroupDragOver,
    clearHostDragOver,
    dragOverGroupId,
    dragOverHostName,
    dragOverPosition,
    draggingGroupId,
    draggingHostName,
    finishGroupDrag,
    finishHostDrag,
    hostDragOverPosition,
    preventSidebarDragDefault,
    setGroupDragOver,
    setHostDragOver,
    startGroupDrag,
    startHostDrag,
  }
}
