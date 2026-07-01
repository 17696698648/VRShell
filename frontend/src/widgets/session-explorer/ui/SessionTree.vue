<template>
  <div
    ref="treeContainerRef"
    :class="['explorer-scroll', 'explorer-tree', 'session-tree', {'is-dragging': isDragging, 'has-vertical-scrollbar': hasVerticalScrollbar}]"
    @pointerdown="onPointerDown"
    @pointermove.prevent="onPointerMove"
    @pointerup="onPointerUp"
    @contextmenu.prevent="onContextMenu"
  >
    <UiTree
      :items="visibleNodes"
      custom-scrollbar
      :active-index="activeNodeIndex"
      :item-height="22"
      :get-key="(node) => node.id"
      :get-level="getNodeLevel"
      :get-parent-key="getParentKey"
      :expanded-keys="expandedKeys"
      label="Sessions"
      @select="selectNode"
      @toggle="toggleNode"
    >
      <template #default="{item: node, treeItemProps}">
        <section
          v-if="node.type === 'group'"
          v-bind="withoutTreeItemClass(treeItemProps)"
          :class="['session-tree__row', 'session-tree__row--group', 'session-group', {
            'session-group--empty': getGroupCount(node.group.id) === 0,
            'session-group--drop-inside': isGroupDropTarget(node.group.id, 'inside'),
            'session-group--drop-after': isGroupDropTarget(node.group.id, 'after'),
          }]"
          :data-group-id="node.group.id"
        >
          <UiDisclosure :open="expandedKeys.includes(node.id)" :badge="getGroupCount(node.group.id)"
                        @update:open="toggleNode(node)">
            <template #title>
              <span class="session-group__title">
                <span class="session-group__icon" aria-hidden="true">
                  <Folder :size="14"/>
                </span>
                <strong>{{ node.group.name }}</strong>
              </span>
            </template>
          </UiDisclosure>
        </section>
        <SessionTreeNode
          v-else
          v-bind="withoutTreeItemClass(treeItemProps)"
          :class="{
            'session-node--drop-before': isSessionDropTarget(node.session.id, 'before'),
            'session-node--drop-after': isSessionDropTarget(node.session.id, 'after'),
          }"
          :session="node.session"
          @edit="(item) => emit('edit', item)"
        />
      </template>
    </UiTree>
    <div v-if="isDragging" ref="ghostRef" class="session-tree__ghost"/>
  </div>
</template>

<script setup lang="ts">
import {Folder} from '@lucide/vue'
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {moveGroup, moveSession, sessionState, type SessionGroup, type SessionHost} from '../../../entities/session'
import {createSessionGroup, deleteSessionGroup} from '../../../features/session/manage-groups/manageSessionGroups'
import {openContextMenu} from '../../../shared/context-menu'
import {UiDisclosure, UiTree} from '../../../shared/ui'
import SessionTreeNode from './SessionTreeNode.vue'

const props = withDefaults(defineProps<{
  filtering?: boolean;
  groups: SessionGroup[];
  sessions: SessionHost[]
}>(), {filtering: false})
const emit = defineEmits<{ create: [group: SessionGroup]; edit: [session: SessionHost] }>()

type SessionTreeFlatNode =
  | { id: string; level: number; parentKey: string | null; type: 'group'; group: SessionGroup }
  | { id: string; level: number; parentKey: string | null; type: 'session'; session: SessionHost }

type DragSourceType =
  | { type: 'session'; session: SessionHost }
  | { type: 'group'; group: SessionGroup }

type DropTarget =
  | { type: 'group'; groupId: string; position: 'inside' | 'after' }
  | { type: 'session'; sessionId: string; position: 'before' | 'after' }

const LONG_PRESS_MS = 180
const DRAG_THRESHOLD_PX = 5

const expandedKeys = ref<string[]>([])
const treeContainerRef = ref<HTMLElement | null>(null)
const ghostRef = ref<HTMLElement | null>(null)
const hasVerticalScrollbar = ref(false)

const dragSource = ref<DragSourceType | null>(null)
const isDragging = ref(false)
const dropTarget = ref<DropTarget | null>(null)

let pressTimer: ReturnType<typeof setTimeout> | null = null
let pressStartX = 0
let pressStartY = 0
let dragDidMove = false
let autoScrollRaf: number | null = null
let resizeObserver: ResizeObserver | null = null

const flatNodes = computed<SessionTreeFlatNode[]>(() => flattenSessionTree())
const visibleNodes = computed(() => flatNodes.value.filter(isNodeVisible))
const activeNodeIndex = computed(() => visibleNodes.value.findIndex((n) => n.type === 'session' && n.session.id === sessionState.activeSessionId))

onMounted(() => {
  updateScrollbarState()
  const virtualList = getVirtualListElement()
  if (!virtualList) return
  resizeObserver = new ResizeObserver(updateScrollbarState)
  resizeObserver.observe(virtualList)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(visibleNodes, () => {
  void nextTick(updateScrollbarState)
})

watch(
  () => props.groups.map((g) => g.id),
  (groupIds, previousGroupIds) => {
    const keys = groupIds.map(getGroupKey)
    const keySet = new Set(keys)
    const previousIds = new Set(previousGroupIds ?? [])
    const addedKeys = groupIds.filter((id) => !previousIds.has(id)).map(getGroupKey)
    expandedKeys.value = Array.from(new Set([...expandedKeys.value.filter((key) => keySet.has(key)), ...addedKeys]))
  },
  {immediate: true},
)

function flattenSessionTree() {
  const nodes: SessionTreeFlatNode[] = []
  const groups = ensureRenderableGroups()
  const rootGroups = groups.filter((g) => !g.parentId || !groups.some((item) => item.id === g.parentId))
  for (const g of rootGroups) appendGroup(nodes, groups, g, 1, null)
  return nodes
}

function appendGroup(nodes: SessionTreeFlatNode[], groups: SessionGroup[], group: SessionGroup, level: number, parentKey: string | null) {
  if (props.filtering && getGroupCount(group.id) === 0) return
  const key = getGroupKey(group.id)
  nodes.push({id: key, level, parentKey, type: 'group', group})
  for (const child of groups.filter((g) => g.parentId === group.id)) appendGroup(nodes, groups, child, level + 1, key)
  for (const s of getOrderedGroupSessions(group)) nodes.push({
    id: s.id,
    level: level + 1,
    parentKey: key,
    type: 'session',
    session: s
  })
}

function getOrderedGroupSessions(group: SessionGroup) {
  const sessionsById = new Map(props.sessions.filter((session) => session.groupId === group.id).map((session) => [session.id, session]))
  const ordered = group.sessionIds.map((sessionId) => sessionsById.get(sessionId)).filter((session): session is SessionHost => Boolean(session))
  const orderedIds = new Set(ordered.map((session) => session.id))
  return [...ordered, ...props.sessions.filter((session) => session.groupId === group.id && !orderedIds.has(session.id))]
}

function ensureRenderableGroups() {
  if (props.groups.some((g) => g.id === 'all')) return props.groups
  return [{id: 'all', name: '所有', sessionIds: []}, ...props.groups.map((g) => ({
    ...g,
    parentId: g.parentId ?? 'all'
  }))]
}

function isNodeVisible(node: SessionTreeFlatNode) {
  let pk = node.parentKey
  while (pk) {
    if (!expandedKeys.value.includes(pk)) return false
    pk = flatNodes.value.find((item) => item.id === pk)?.parentKey ?? null
  }
  return true
}

function getNodeLevel(node: SessionTreeFlatNode) {
  return node.level
}

function getParentKey(node: SessionTreeFlatNode) {
  return node.parentKey
}

function withoutTreeItemClass(treeItemProps: Record<string, unknown>) {
  const {class: _class, ...props} = treeItemProps
  return props
}

function getVirtualListElement() {
  return treeContainerRef.value?.querySelector<HTMLElement>('.ui-virtual-list') ?? null
}

function updateScrollbarState() {
  const virtualList = getVirtualListElement()
  hasVerticalScrollbar.value = Boolean(virtualList && virtualList.scrollHeight > virtualList.clientHeight + 1)
}

function selectNode(node: SessionTreeFlatNode) {
  if (dragDidMove) {
    dragDidMove = false;
    return
  }
  if (node.type === 'session') sessionState.activeSessionId = node.session.id
}

function toggleNode(node: SessionTreeFlatNode) {
  if (dragDidMove) {
    dragDidMove = false;
    return
  }
  if (node.type !== 'group') return
  const key = getGroupKey(node.group.id)
  expandedKeys.value = expandedKeys.value.includes(key) ? expandedKeys.value.filter((k) => k !== key) : [...expandedKeys.value, key]
}

function getGroupCount(groupId: string) {
  const childIds = collectChildGroupIds(groupId)
  return props.sessions.filter((s) => s.groupId === groupId || childIds.includes(s.groupId)).length
}

function collectChildGroupIds(groupId: string) {
  const ids: string[] = []
  for (let i = 0; i < ids.length + 1; i += 1) {
    const pid = i === 0 ? groupId : ids[i - 1]
    ids.push(...props.groups.filter((g) => g.parentId === pid).map((g) => g.id))
  }
  return ids
}

function getGroupKey(groupId: string) {
  return `group-${groupId}`
}

function isGroupDropTarget(groupId: string, position: 'inside' | 'after') {
  return dropTarget.value?.type === 'group' && dropTarget.value.groupId === groupId && dropTarget.value.position === position
}

function isSessionDropTarget(sessionId: string, position: 'before' | 'after') {
  return dropTarget.value?.type === 'session' && dropTarget.value.sessionId === sessionId && dropTarget.value.position === position
}

function onContextMenu(event: MouseEvent) {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-group-id]')
  if (!target || !treeContainerRef.value?.contains(target)) return
  const groupId = target.dataset.groupId!
  const group = props.groups.find((g) => g.id === groupId)
  if (!group) return
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'new-session', label: 'New session', run: () => emit('create', group)},
      {id: 'new-subgroup', label: 'New subgroup', run: () => createSessionGroup(group)},
      {
        id: 'delete-group', label: 'Delete group', danger: true, disabled: group.id === 'all', run: async () => {
          await deleteSessionGroup(group)
        }
      },
    ],
  })
}

function findDragSource(el: HTMLElement): DragSourceType | null {
  const sessionEl = el.closest<HTMLElement>('.session-node[data-session-id]')
  if (sessionEl && treeContainerRef.value?.contains(sessionEl)) {
    const sessionId = sessionEl.dataset.sessionId!
    const session = props.sessions.find((s) => s.id === sessionId)
    if (session) return {type: 'session', session}
  }
  const groupEl = el.closest<HTMLElement>('[data-group-id]')
  if (groupEl && treeContainerRef.value?.contains(groupEl)) {
    const groupId = groupEl.dataset.groupId!
    if (groupId === 'all') return null
    const group = props.groups.find((g) => g.id === groupId)
    if (group) return {type: 'group', group}
  }
  return null
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  const el = event.target as HTMLElement
  const source = findDragSource(el)
  if (!source) return

  pressStartX = event.clientX
  pressStartY = event.clientY
  dragDidMove = false

  pressTimer = setTimeout(() => {
    pressTimer = null
    startDrag(source, event)
  }, LONG_PRESS_MS)
}

function startDrag(source: DragSourceType, event: PointerEvent) {
  dragSource.value = source
  isDragging.value = true

  nextTick(() => {
    if (ghostRef.value) {
      const label = source.type === 'session' ? source.session.name : source.group.name
      ghostRef.value.textContent = label
      ghostRef.value.style.left = `${event.clientX}px`
      ghostRef.value.style.top = `${event.clientY}px`
    }
  })

  document.addEventListener('pointermove', onDocPointerMove)
  document.addEventListener('pointerup', onDocPointerUp)
}

function onPointerMove(event: PointerEvent) {
  if (!pressTimer) return
  const dx = event.clientX - pressStartX
  const dy = event.clientY - pressStartY
  if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

function onDocPointerMove(event: PointerEvent) {
  if (!isDragging.value) return
  dragDidMove = true

  if (ghostRef.value) {
    ghostRef.value.style.left = `${event.clientX}px`
    ghostRef.value.style.top = `${event.clientY}px`
  }

  dropTarget.value = resolveDropTarget(event.clientX, event.clientY)

  // Auto-scroll near edges
  handleAutoScroll(event.clientY)
}

function resolveDropTarget(clientX: number, clientY: number): DropTarget | null {
  if (ghostRef.value) ghostRef.value.style.display = 'none'
  const elAtPoint = document.elementFromPoint(clientX, clientY) as HTMLElement | null
  if (ghostRef.value) ghostRef.value.style.display = ''
  if (!elAtPoint || !treeContainerRef.value?.contains(elAtPoint)) return null

  const sessionEl = elAtPoint.closest<HTMLElement>('.session-node[data-session-id]')
  if (sessionEl && treeContainerRef.value.contains(sessionEl)) {
    const sessionId = sessionEl.dataset.sessionId!
    if (dragSource.value?.type === 'session' && dragSource.value.session.id === sessionId) return null
    const {top, height} = sessionEl.getBoundingClientRect()
    return {type: 'session', sessionId, position: clientY < top + height / 2 ? 'before' : 'after'}
  }

  const groupEl = elAtPoint.closest<HTMLElement>('[data-group-id]')
  if (!groupEl || !treeContainerRef.value.contains(groupEl)) return null
  const groupId = groupEl.dataset.groupId!
  if (dragSource.value?.type === 'group' && dragSource.value.group.id === groupId) return null
  const summaryEl = groupEl.querySelector<HTMLElement>('.ui-disclosure__summary') ?? groupEl
  const {top, height} = summaryEl.getBoundingClientRect()
  return {type: 'group', groupId, position: clientY > top + height * 0.65 ? 'after' : 'inside'}
}

function onDocPointerUp() {
  if (isDragging.value) executeDrop()
  cancelDrag()
}

function onPointerUp() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null
  }
}

function executeDrop() {
  if (!dragSource.value || !dropTarget.value) return

  if (dragSource.value.type === 'session') {
    dropSession(dragSource.value.session, dropTarget.value)
  } else {
    dropGroup(dragSource.value.group, dropTarget.value)
  }
}

function dropSession(session: SessionHost, target: DropTarget) {
  if (target.type === 'session') {
    const targetSession = props.sessions.find((item) => item.id === target.sessionId)
    if (!targetSession || targetSession.id === session.id) return
    const targetGroup = props.groups.find((group) => group.id === targetSession.groupId)
    if (!targetGroup) return
    moveSession(session.id, targetGroup.id, getSessionInsertIndex(targetGroup, targetSession.id, session.id, target.position))
    return
  }

  const targetGroup = props.groups.find((group) => group.id === target.groupId)
  if (!targetGroup) return
  if (target.position === 'inside') {
    moveSession(session.id, targetGroup.id, targetGroup.sessionIds.length)
  } else {
    moveSession(session.id, targetGroup.id, 0)
  }
}

function dropGroup(group: SessionGroup, target: DropTarget) {
  const targetGroup = target.type === 'session'
    ? props.groups.find((item) => item.id === props.sessions.find((session) => session.id === target.sessionId)?.groupId)
    : props.groups.find((item) => item.id === target.groupId)
  if (!targetGroup || targetGroup.id === group.id) return

  const targetParentId = target.position === 'inside' || targetGroup.id === 'all' ? targetGroup.id : targetGroup.parentId ?? null
  const siblings = props.groups.filter((item) => (item.parentId ?? null) === targetParentId && item.id !== group.id)
  const targetSiblingIndex = siblings.findIndex((item) => item.id === targetGroup.id)
  const targetIndex = target.position === 'inside' || targetGroup.id === 'all' ? siblings.length : targetSiblingIndex + 1
  moveGroup(group.id, targetParentId, targetIndex)
}

function getSessionInsertIndex(targetGroup: SessionGroup, targetSessionId: string, movingSessionId: string, position: 'before' | 'after') {
  const sessionIds = targetGroup.sessionIds.filter((id) => id !== movingSessionId)
  const targetIndex = sessionIds.indexOf(targetSessionId)
  if (targetIndex < 0) return sessionIds.length
  return position === 'before' ? targetIndex : targetIndex + 1
}

function cancelDrag() {
  document.removeEventListener('pointermove', onDocPointerMove)
  document.removeEventListener('pointerup', onDocPointerUp)
  dragSource.value = null
  isDragging.value = false
  dropTarget.value = null
  dragDidMove = false
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null
  }
  if (autoScrollRaf) {
    cancelAnimationFrame(autoScrollRaf);
    autoScrollRaf = null
  }
}

function handleAutoScroll(clientY: number) {
  if (!treeContainerRef.value) return
  const rect = treeContainerRef.value.getBoundingClientRect()
  const edge = 40
  const speed = 6

  if (clientY < rect.top + edge) {
    if (!autoScrollRaf) autoScrollRaf = requestAnimationFrame(() => {
      treeContainerRef.value!.scrollTop -= speed;
      autoScrollRaf = null
    })
  } else if (clientY > rect.bottom - edge) {
    if (!autoScrollRaf) autoScrollRaf = requestAnimationFrame(() => {
      treeContainerRef.value!.scrollTop += speed;
      autoScrollRaf = null
    })
  }
}
</script>
