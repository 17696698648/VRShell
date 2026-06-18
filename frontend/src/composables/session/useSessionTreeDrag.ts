import { reactive, ref, onUnmounted } from 'vue'
import type { GroupDropPosition, HostDropPosition, SessionGroup } from '../../components/SessionTreeGroup.vue'

export type SessionTreeDragKind = 'group' | 'host'

export type SessionTreeDropTarget =
  | { kind: 'group'; id: string; position: GroupDropPosition; element: HTMLElement }
  | { kind: 'host'; id: string; position: HostDropPosition; element: HTMLElement }

type SessionTreeDragProps = {
  group: SessionGroup
  expandedGroups: Record<string, boolean>
  editingGroupId: string
  lockedGroupId: string
}

type SessionTreeDragEmitters = {
  groupDragStart(groupId: string): void
  groupDragOver(groupId: string, position: GroupDropPosition): void
  groupDragLeave(groupId: string): void
  groupDrop(sourceGroupId: string, targetGroupId: string, position: GroupDropPosition): void
  groupDragEnd(): void
  hostDragStart(hostName: string): void
  hostDragOver(hostName: string, position: HostDropPosition): void
  hostDragLeave(hostName: string): void
  hostDrop(sourceHostName: string, targetHostName: string, position: HostDropPosition): void
  hostDropToGroup(sourceHostName: string, groupId: string): void
  hostDragEnd(): void
}

type UseSessionTreeDragOptions = {
  props: SessionTreeDragProps
  emitters: SessionTreeDragEmitters
  getGroupLabel(groupId: string): string
}

type PointerDragState = {
  pointerId: number
  kind: SessionTreeDragKind
  id: string
  startX: number
  startY: number
  startTime: number
  started: boolean
  sourceElement: HTMLElement
  latestTarget: SessionTreeDropTarget | null
}

const pointerDragThreshold = 8
const pointerDragDelayMs = 150
const autoExpandDelayMs = 500
const autoScrollThreshold = 28
const autoScrollStep = 14
const dragGhostMaxWidth = 260
const dragGhostMaxHeight = 56
const dragGhostOffset = 14
const dragGhostViewportPadding = 8

export function useSessionTreeDrag({ props, emitters, getGroupLabel }: UseSessionTreeDragOptions) {
  const dragGhost = reactive({
    visible: false,
    kind: '' as SessionTreeDragKind | '',
    label: '',
    hint: '',
    x: 0,
    y: 0,
  })

  let suppressNextGroupClick = false
  const dragInvalidGroupId = ref('')
  let autoExpandTimer: number | null = null
  let autoExpandGroupId = ''
  let pointerDragState: PointerDragState | null = null

  function startPointerDrag(event: PointerEvent, kind: SessionTreeDragKind, id: string) {
    if (event.button !== 0 || event.pointerType === 'touch') return
    if (kind === 'group' && (id === props.lockedGroupId || props.editingGroupId === id)) return

    pointerDragState = {
      pointerId: event.pointerId,
      kind,
      id,
      startX: event.clientX,
      startY: event.clientY,
      startTime: window.performance.now(),
      started: false,
      sourceElement: event.currentTarget as HTMLElement,
      latestTarget: null,
    }

    pointerDragState.sourceElement.setPointerCapture(event.pointerId)
  }

  function updatePointerDrag(event: PointerEvent) {
    if (!pointerDragState || event.pointerId !== pointerDragState.pointerId) return

    const moveX = Math.abs(event.clientX - pointerDragState.startX)
    const moveY = Math.abs(event.clientY - pointerDragState.startY)
    const hasEnoughMovement = moveX + moveY >= pointerDragThreshold
    const hasEnoughDelay = window.performance.now() - pointerDragState.startTime >= pointerDragDelayMs
    if (!pointerDragState.started && (!hasEnoughMovement || !hasEnoughDelay)) return

    event.preventDefault()

    if (!pointerDragState.started) {
      pointerDragState.started = true
      if (pointerDragState.kind === 'group') {
        emitters.groupDragStart(pointerDragState.id)
      } else {
        emitters.hostDragStart(pointerDragState.id)
      }
    }

    updateDragGhost(event.clientX, event.clientY)
    autoScrollSessionTree(event.clientX, event.clientY)
    updateDropTarget(event.clientX, event.clientY)
  }

  function finishPointerDrag(event: PointerEvent) {
    if (!pointerDragState || event.pointerId !== pointerDragState.pointerId) return

    const dragState = pointerDragState
    const target = dragState.latestTarget

    releasePointerCapture(dragState)
    pointerDragState = null
    resetDragUiState()

    if (!dragState.started) return

    suppressNextGroupClick = dragState.kind === 'group'
    event.preventDefault()
    event.stopPropagation()

    if (dragState.kind === 'group') {
      if (target?.kind === 'group' && target.id !== dragState.id) {
        emitters.groupDrop(dragState.id, target.id, target.position)
      } else {
        emitters.groupDragEnd()
      }
      return
    }

    if (target?.kind === 'host' && target.id !== dragState.id) {
      emitters.hostDrop(dragState.id, target.id, target.position)
    } else if (target?.kind === 'group') {
      emitters.hostDropToGroup(dragState.id, target.id)
    } else {
      emitters.hostDragEnd()
    }
  }

  function cancelPointerDrag(event?: PointerEvent) {
    if (!pointerDragState || (event && event.pointerId !== pointerDragState.pointerId)) return

    const dragState = pointerDragState
    releasePointerCapture(dragState)
    pointerDragState = null
    resetDragUiState()

    if (dragState.started) {
      if (dragState.kind === 'group') {
        emitters.groupDragEnd()
      } else {
        emitters.hostDragEnd()
      }
    }
  }

  function consumeSuppressNextGroupClick() {
    if (!suppressNextGroupClick) return false
    suppressNextGroupClick = false
    return true
  }

  function isPointerDragStarted() {
    return Boolean(pointerDragState?.started)
  }

  function getDragInvalidGroupId() {
    return dragInvalidGroupId.value
  }

  function releasePointerCapture(dragState: Pick<PointerDragState, 'pointerId' | 'sourceElement'>) {
    if (dragState.sourceElement.hasPointerCapture(dragState.pointerId)) {
      dragState.sourceElement.releasePointerCapture(dragState.pointerId)
    }
  }

  function updateDropTarget(clientX: number, clientY: number) {
    if (!pointerDragState) return

    const target = findDragTarget(clientX, clientY)
    const previousTarget = pointerDragState.latestTarget

    if (sameDropTarget(previousTarget, target)) return

    clearPreviousTarget(previousTarget)
    dragInvalidGroupId.value = ''
    pointerDragState.latestTarget = target

    if (!target) {
      clearAutoExpandTimer()
      return
    }

    if (isInvalidDropTarget(target)) {
      if (target.kind === 'group') dragInvalidGroupId.value = target.id
      clearAutoExpandTimer()
      return
    }

    if (pointerDragState.kind === 'group' && target.kind === 'group') {
      emitters.groupDragOver(target.id, target.position)
      scheduleAutoExpand(target)
    } else if (pointerDragState.kind === 'host' && target.kind === 'host' && target.id !== pointerDragState.id) {
      emitters.hostDragOver(target.id, target.position)
      clearAutoExpandTimer()
    } else if (pointerDragState.kind === 'host' && target.kind === 'group') {
      emitters.groupDragOver(target.id, target.position)
      scheduleAutoExpand(target)
    }
  }

  function isInvalidDropTarget(target: SessionTreeDropTarget) {
    if (!pointerDragState) return true
    if (target.kind === 'group' && target.id === props.lockedGroupId) return true

    if (pointerDragState.kind === 'group') {
      if (target.kind !== 'group') return true
      if (target.id === pointerDragState.id) return true
      if (isDescendantGroup(pointerDragState.id, target.id)) return true
    }

    return pointerDragState.kind === 'host' && target.kind === 'host' && target.id === pointerDragState.id
  }

  function isDescendantGroup(sourceGroupId: string, targetGroupId: string) {
    const sourceGroup = findGroupById(sourceGroupId, props.group)
    if (!sourceGroup) return false
    return Boolean(findGroupById(targetGroupId, sourceGroup, true))
  }

  function findGroupById(groupId: string, group: SessionGroup, skipSelf = false): SessionGroup | null {
    if (!skipSelf && group.id === groupId) return group

    for (const child of group.children) {
      const found = findGroupById(groupId, child)
      if (found) return found
    }

    return null
  }

  function scheduleAutoExpand(target: SessionTreeDropTarget) {
    if (target.kind !== 'group' || target.position !== 'inside' || props.expandedGroups[target.id]) {
      clearAutoExpandTimer()
      return
    }

    if (autoExpandGroupId === target.id && autoExpandTimer !== null) return

    clearAutoExpandTimer()
    autoExpandGroupId = target.id
    autoExpandTimer = window.setTimeout(() => {
      props.expandedGroups[target.id] = true
      clearAutoExpandTimer()
    }, autoExpandDelayMs)
  }

  function clearAutoExpandTimer() {
    if (autoExpandTimer !== null) {
      window.clearTimeout(autoExpandTimer)
    }
    autoExpandTimer = null
    autoExpandGroupId = ''
  }

  function updateDragGhost(clientX: number, clientY: number) {
    if (!pointerDragState?.started) return

    dragGhost.visible = true
    dragGhost.kind = pointerDragState.kind
    dragGhost.label = getDragLabel(pointerDragState.kind, pointerDragState.id)
    dragGhost.hint = getDragHint(pointerDragState)
    dragGhost.x = clampDragGhostX(clientX)
    dragGhost.y = clampDragGhostY(clientY)
  }

  function getDragLabel(kind: SessionTreeDragKind, id: string) {
    return kind === 'host' ? id : getGroupLabel(id)
  }

  function clampDragGhostX(clientX: number) {
    const preferredX = clientX + dragGhostOffset
    const maxX = window.innerWidth - dragGhostMaxWidth - dragGhostViewportPadding
    if (preferredX <= maxX) return preferredX
    return Math.max(dragGhostViewportPadding, clientX - dragGhostMaxWidth - dragGhostOffset)
  }

  function clampDragGhostY(clientY: number) {
    const preferredY = clientY + dragGhostOffset
    const maxY = window.innerHeight - dragGhostMaxHeight - dragGhostViewportPadding
    if (preferredY <= maxY) return preferredY
    return Math.max(dragGhostViewportPadding, window.innerHeight - dragGhostMaxHeight - dragGhostViewportPadding)
  }

  function getDragHint(dragState: PointerDragState) {
    const target = dragState.latestTarget
    const sourceType = dragState.kind === 'group' ? 'group' : 'session'

    if (!target) return `Move ${sourceType}`
    if (isInvalidDropTarget(target)) return 'Drop not allowed here'
    if (target.kind === 'host') return `${target.position === 'before' ? 'Before' : 'After'} ${target.id}`

    const targetLabel = getGroupLabel(target.id)
    if (target.position === 'inside') return `Move into ${targetLabel}`
    return `${target.position === 'before' ? 'Before' : 'After'} ${targetLabel}`
  }

  function autoScrollSessionTree(clientX: number, clientY: number) {
    const element = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    const scroller = element?.closest<HTMLElement>('.session-tree')
    if (!scroller) return

    const rect = scroller.getBoundingClientRect()
    if (clientY < rect.top + autoScrollThreshold) {
      scroller.scrollTop -= autoScrollStep
    } else if (clientY > rect.bottom - autoScrollThreshold) {
      scroller.scrollTop += autoScrollStep
    }
  }

  function resetDragUiState() {
    dragGhost.visible = false
    dragGhost.kind = ''
    dragGhost.label = ''
    dragGhost.hint = ''
    dragInvalidGroupId.value = ''
    clearAutoExpandTimer()
  }

  function findDragTarget(clientX: number, clientY: number): SessionTreeDropTarget | null {
    if (!pointerDragState) return null

    const element = getElementBelowDragSource(clientX, clientY)
    if (!element) return null

    const hostElement = element.closest<HTMLElement>('.tree-host')
    if (hostElement?.dataset.hostName) {
      const rect = hostElement.getBoundingClientRect()
      return {
        kind: 'host',
        id: hostElement.dataset.hostName,
        position: getHostDropPosition(clientY, rect),
        element: hostElement,
      }
    }

    const groupHeaderElement = element.closest<HTMLElement>('.tree-group-header')
    const groupElement = groupHeaderElement?.closest<HTMLElement>('.tree-group')
    if (groupHeaderElement && groupElement?.dataset.groupId && groupElement.dataset.groupId !== props.lockedGroupId) {
      const rect = groupHeaderElement.getBoundingClientRect()
      return {
        kind: 'group',
        id: groupElement.dataset.groupId,
        position: getGroupDropPosition(clientY, rect),
        element: groupHeaderElement,
      }
    }

    const childrenElement = element.closest<HTMLElement>('.tree-children')
    const parentGroup = childrenElement?.closest<HTMLElement>('.tree-group')
    if (childrenElement && parentGroup?.dataset.groupId) {
      return {
        kind: 'group',
        id: parentGroup.dataset.groupId,
        position: 'inside',
        element: childrenElement,
      }
    }

    return null
  }

  function getElementBelowDragSource(clientX: number, clientY: number): HTMLElement | null {
    if (!pointerDragState) return null

    const sourceElement = pointerDragState.sourceElement
    const previousPointerEvents = sourceElement.style.pointerEvents

    try {
      sourceElement.style.pointerEvents = 'none'
      return document.elementFromPoint(clientX, clientY) as HTMLElement | null
    } finally {
      sourceElement.style.pointerEvents = previousPointerEvents
    }
  }

  function getGroupDropPosition(clientY: number, rect: DOMRect): GroupDropPosition {
    const offsetY = clientY - rect.top
    const edgeSize = Math.min(8, rect.height * 0.3)

    if (offsetY <= edgeSize) return 'before'
    if (offsetY >= rect.height - edgeSize) return 'after'
    return 'inside'
  }

  function getHostDropPosition(clientY: number, rect: DOMRect): HostDropPosition {
    return clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  }

  function sameDropTarget(left: SessionTreeDropTarget | null, right: SessionTreeDropTarget | null) {
    return left?.kind === right?.kind && left?.id === right?.id && left?.position === right?.position
  }

  function clearPreviousTarget(target: SessionTreeDropTarget | null) {
    if (!target) return

    if (target.kind === 'group') {
      emitters.groupDragLeave(target.id)
    } else {
      emitters.hostDragLeave(target.id)
    }
  }

  onUnmounted(() => cancelPointerDrag())

  return {
    dragGhost,
    getDragInvalidGroupId,
    startPointerDrag,
    updatePointerDrag,
    finishPointerDrag,
    cancelPointerDrag,
    consumeSuppressNextGroupClick,
    isPointerDragStarted,
  }
}
