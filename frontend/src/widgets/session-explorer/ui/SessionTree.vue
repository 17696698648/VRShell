<template>
  <div class="session-tree" role="tree" aria-label="Sessions" @keydown.down.prevent="focusNext" @keydown.up.prevent="focusPrevious">
    <UiVirtualList :items="flatNodes" :item-height="34" :get-key="(node) => node.id">
      <template #default="{item: node}">
        <section v-if="node.type === 'group'" class="session-group">
          <h3 @contextmenu.prevent="openGroupMenu($event, node.group)">{{ node.group.name }}</h3>
        </section>
        <SessionTreeNode
          v-else
          :groups="groups"
          :session="node.session"
          @edit="(item) => emit('edit', item)"
        />
      </template>
    </UiVirtualList>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import type {SessionGroup, SessionHost} from '../../../entities/session'
import {deleteSessionGroup} from '../../../features/session/manage-groups/manageSessionGroups'
import {openContextMenu} from '../../../shared/context-menu'
import {UiVirtualList} from '../../../shared/ui'
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

function openGroupMenu(event: MouseEvent, group: SessionGroup) {
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'delete-group', label: 'Delete group', danger: true, disabled: props.groups.length <= 1, run: async () => { await deleteSessionGroup(group) }},
    ],
  })
}

function focusNext(event: KeyboardEvent) {
  focusSibling(event, 1)
}

function focusPrevious(event: KeyboardEvent) {
  focusSibling(event, -1)
}

function focusSibling(event: KeyboardEvent, direction: 1 | -1) {
  const items = Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="treeitem"]'))
  const index = items.indexOf(document.activeElement as HTMLElement)
  const next = items[Math.max(0, Math.min(items.length - 1, index + direction))]
  next?.focus()
}
</script>
