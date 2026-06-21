<template>
  <div class="session-tree">
    <section v-for="group in groups" :key="group.id" class="session-group">
      <h3 @contextmenu.prevent="openGroupMenu($event, group)">{{ group.name }}</h3>
      <SessionTreeNode
        v-for="session in sessions.filter((item) => item.groupId === group.id)"
        :key="session.id"
        :groups="groups"
        :session="session"
        @edit="(item) => emit('edit', item)"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import type {SessionGroup, SessionHost} from '../../../entities/session'
import {deleteSessionGroup} from '../../../features/session/manage-groups/manageSessionGroups'
import {openContextMenu} from '../../../shared/context-menu'
import SessionTreeNode from './SessionTreeNode.vue'

const props = defineProps<{groups: SessionGroup[]; sessions: SessionHost[]}>()
const emit = defineEmits<{edit: [session: SessionHost]}>()

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
