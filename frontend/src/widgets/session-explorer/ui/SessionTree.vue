<template>
  <div class="session-tree">
    <UiTree :items="visibleNodes" :active-index="activeNodeIndex" :item-height="34" :get-key="(node) => node.id" :get-level="getNodeLevel" :get-parent-key="getParentKey" :expanded-keys="expandedKeys" label="Sessions" @select="selectNode" @toggle="toggleNode">
      <template #default="{item: node, treeItemProps}">
        <section v-if="node.type === 'group'" v-bind="treeItemProps" class="session-group" @contextmenu.prevent="openGroupMenu($event, node.group)">
          <UiDisclosure :open="expandedKeys.includes(node.id)" :title="node.group.name" :badge="getGroupCount(node.group.id)" @update:open="toggleNode(node)" />
        </section>
        <SessionTreeNode
          v-else
          v-bind="treeItemProps"
          :groups="groups"
          :session="node.session"
          @edit="(item) => emit('edit', item)"
        />
      </template>
    </UiTree>
  </div>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {sessionState, type SessionGroup, type SessionHost} from '../../../entities/session'
import {createSessionGroup, deleteSessionGroup} from '../../../features/session/manage-groups/manageSessionGroups'
import {openContextMenu} from '../../../shared/context-menu'
import {UiDisclosure, UiTree} from '../../../shared/ui'
import SessionTreeNode from './SessionTreeNode.vue'

const props = defineProps<{groups: SessionGroup[]; sessions: SessionHost[]}>()
const emit = defineEmits<{create: [group: SessionGroup]; edit: [session: SessionHost]}>()

type SessionTreeFlatNode =
  | {id: string; level: number; parentKey: string | null; type: 'group'; group: SessionGroup}
  | {id: string; level: number; parentKey: string | null; type: 'session'; session: SessionHost}

const expandedKeys = ref<string[]>([])
const flatNodes = computed<SessionTreeFlatNode[]>(() => flattenSessionTree())
const visibleNodes = computed(() => flatNodes.value.filter(isNodeVisible))
const activeNodeIndex = computed(() => visibleNodes.value.findIndex((node) => node.type === 'session' && node.session.id === sessionState.activeSessionId))

watch(
  () => props.groups.map((group) => group.id),
  () => {
    const keys = props.groups.map((group) => getGroupKey(group.id))
    expandedKeys.value = Array.from(new Set([...expandedKeys.value.filter((key) => keys.includes(key)), ...keys]))
  },
  {immediate: true},
)

function flattenSessionTree() {
  const nodes: SessionTreeFlatNode[] = []
  const groups = ensureRenderableGroups()
  const rootGroups = groups.filter((group) => !group.parentId || !groups.some((item) => item.id === group.parentId))
  for (const group of rootGroups) appendGroup(nodes, groups, group, 1, null)
  return nodes
}

function appendGroup(nodes: SessionTreeFlatNode[], groups: SessionGroup[], group: SessionGroup, level: number, parentKey: string | null) {
  const groupKey = getGroupKey(group.id)
  nodes.push({id: groupKey, level, parentKey, type: 'group', group})
  for (const child of groups.filter((item) => item.parentId === group.id)) appendGroup(nodes, groups, child, level + 1, groupKey)
  for (const session of props.sessions.filter((item) => item.groupId === group.id)) nodes.push({id: session.id, level: level + 1, parentKey: groupKey, type: 'session', session})
}

function ensureRenderableGroups() {
  if (props.groups.some((group) => group.id === 'all')) return props.groups
  return [{id: 'all', name: '所有', sessionIds: []}, ...props.groups.map((group) => ({...group, parentId: group.parentId ?? 'all'}))]
}

function isNodeVisible(node: SessionTreeFlatNode) {
  let parentKey = node.parentKey
  while (parentKey) {
    if (!expandedKeys.value.includes(parentKey)) return false
    parentKey = flatNodes.value.find((item) => item.id === parentKey)?.parentKey ?? null
  }
  return true
}

function getNodeLevel(node: SessionTreeFlatNode) {
  return node.level
}

function getParentKey(node: SessionTreeFlatNode) {
  return node.parentKey
}

function selectNode(node: SessionTreeFlatNode) {
  if (node.type === 'session') sessionState.activeSessionId = node.session.id
}

function toggleNode(node: SessionTreeFlatNode) {
  if (node.type !== 'group') return
  const key = getGroupKey(node.group.id)
  expandedKeys.value = expandedKeys.value.includes(key) ? expandedKeys.value.filter((item) => item !== key) : [...expandedKeys.value, key]
}

function getGroupCount(groupId: string) {
  const childGroupIds = collectChildGroupIds(groupId)
  return props.sessions.filter((session) => session.groupId === groupId || childGroupIds.includes(session.groupId)).length
}

function collectChildGroupIds(groupId: string) {
  const ids: string[] = []
  for (let index = 0; index < ids.length + 1; index += 1) {
    const parentId = index === 0 ? groupId : ids[index - 1]
    ids.push(...props.groups.filter((group) => group.parentId === parentId).map((group) => group.id))
  }
  return ids
}

function openGroupMenu(event: MouseEvent, group: SessionGroup) {
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'new-session', label: 'New session', run: () => emit('create', group)},
      {id: 'new-subgroup', label: 'New subgroup', run: () => createSessionGroup(group)},
      {id: 'delete-group', label: 'Delete group', danger: true, disabled: group.id === 'all', run: async () => { await deleteSessionGroup(group) }},
    ],
  })
}

function getGroupKey(groupId: string) {
  return `group-${groupId}`
}
</script>
