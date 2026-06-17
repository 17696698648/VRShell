<template>
  <div class="tree-toolbar">
    <strong>Sessions</strong>
    <div class="tree-actions">
      <UiButton variant="icon" title="新增分组" v-tooltip="{ text: '新增分组', placement: 'bottom' }" aria-label="新增分组" @click="emit('create-root-group')">
        <FolderPlus :size="14" />
      </UiButton>
      <UiButton variant="icon" title="新增会话" v-tooltip="{ text: '新增会话', placement: 'bottom' }" aria-label="新增会话" @click="emit('create-session')">
        <SquareTerminal :size="14" />
      </UiButton>
      <UiButton variant="icon" title="折叠全部" v-tooltip="{ text: '折叠全部', placement: 'bottom' }" aria-label="折叠全部" @click="emit('collapse-all-groups')">
        <Folders :size="14" />
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FolderPlus, Folders, SquareTerminal } from '@lucide/vue'
import UiButton from './ui/UiButton.vue'

const emit = defineEmits<{
  (event: 'create-root-group'): void
  (event: 'create-session'): void
  (event: 'collapse-all-groups'): void
}>()
</script>

<style scoped>
.tree-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -4px -2px 2px;
  padding: 2px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(8, 11, 18, 0.22);
}

.tree-toolbar strong {
  padding-left: 4px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.tree-actions {
  display: flex;
  gap: 4px;
}

</style>
