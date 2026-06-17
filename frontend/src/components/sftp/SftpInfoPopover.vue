<template>
  <div
    v-if="visible && file"
    class="sftp-info-popover"
    :style="{ left: `${x}px`, top: `${y}px` }"
    @mouseenter="emit('keep')"
    @mouseleave="emit('hide')"
  >
    <strong>{{ file.name }}</strong>
    <small>{{ file.isDirectory ? '文件夹' : '文件' }}</small>
    <small>路径：{{ file.path }}</small>
    <small v-if="!file.isDirectory">大小：{{ file.size }}</small>
    <small>修改时间：{{ file.modifiedText }}</small>
  </div>
</template>

<script setup lang="ts">
import type {SftpTreeNode} from '../../types'

defineProps<{
  visible: boolean
  file: SftpTreeNode | null
  x: number
  y: number
}>()

const emit = defineEmits<{
  (event: 'keep'): void
  (event: 'hide'): void
}>()
</script>

<style scoped>
.sftp-info-popover {
  position: fixed;
  z-index: var(--z-titlebar);
  display: grid;
  gap: 4px;
  width: min(260px, 72vw);
  padding: 8px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(8, 11, 18, 0.98);
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.36);
  color: #cbd5e1;
  pointer-events: auto;
}

.sftp-info-popover strong,
.sftp-info-popover small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sftp-info-popover strong {
  color: #e5edf8;
  font-size: 11px;
}

.sftp-info-popover small {
  color: #94a3b8;
  font-size: 10px;
}
</style>
