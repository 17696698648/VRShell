<template>
  <div class="session-tree">
    <UiTree :items="visibleNodes" :active-index="activeNodeIndex" :item-height="34" :get-key="(node) => node.id" :get-level="getNodeLevel" :get-parent-key="getParentKey" :expanded-keys="expandedKeys" label="Sessions" @select="selectNode" @toggle="toggleNode">
      <template #default="{item: node, treeItemProps}">
        <section v-if="node.type === 'group'" v-bind="treeItemProps" class="session-group">
          <h3 @contextmenu.prevent="openGroupMenu($event, node.group)">{{ node.group.name }}</h3>
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
import {computed, ref} from 'vue'
import {sessionState, type SessionGroup, type SessionHost} from '../../../entities/session'
import {deleteSessionGroup} from '../../../features/session/manage-groups/manageSessionGroups'
import {openContextMenu} from '../../../shared/context-menu'
import {UiTree} from '../../../shared/ui'
import SessionTreeNode from './SessionTreeNode.vue'

const props = defineProps<{groups: SessionGroup[]; sessions: SessionHost[]}>()
const emit = defineEmits<{edit: [session: SessionHost]}>()

type SessionTreeFlatNode = {id: string; type: 'group'; group: SessionGroup} | {id: string; type: 'session'; session: SessionHost}

const flatNodes = computed<SessionTreeFlatNode[]>(() =>
  props.groups.flatMap((group) => [
    {id: `group-${group.id}`, type: 'group' as const, group},
    ...props.sessions.filter((session) => session.groupId === group.id).map((session) => ({id: session.id, type: 'session' as const, session})),
  ]),
)
const expandedKeys = ref<string[]>(props.groups.map((group) => `group-${group.id}`))
const visibleNodes = computed(() => flatNodes.value.filter((node) => node.type === 'group' || expandedKeys.value.includes(`group-${node.session.groupId}`)))
const activeNodeIndex = computed(() => visibleNodes.value.findIndex((node) => node.type === 'session' && node.session.id === sessionState.activeSessionId))

function getNodeLevel(node: SessionTreeFlatNode) {
  return node.type === 'group' ? 1 : 2
}

function getParentKey(node: SessionTreeFlatNode) {
  return node.type === 'session' ? `group-${node.session.groupId}` : null
}

function selectNode(node: SessionTreeFlatNode) {
  if (node.type === 'session') sessionState.activeSessionId = node.session.id
}

function toggleNode(node: SessionTreeFlatNode) {
  if (node.type !== 'group') return
  const key = `group-${node.group.id}`
  expandedKeys.value = expandedKeys.value.includes(key) ? expandedKeys.value.filter((item) => item !== key) : [...expandedKeys.value, key]
}

function openGroupMenu(event: MouseEvent, group: SessionGroup) {
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'delete-group', label: 'Delete group', danger: true, disabled: props.groups.length <= 1, run: async () => { await deleteSessionGroup(group) }},
    ],
  })
}

</script>
