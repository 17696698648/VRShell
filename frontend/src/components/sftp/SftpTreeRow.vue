<template>
  <div
    class="file-table-row sftp-tree-row"
    :class="{ active, 'drop-target': dropTarget }"
    :title="file.path"
    @dragenter.prevent="emit('drag-enter', file)"
    @dragover.prevent="emit('drag-enter', file)"
    @contextmenu="emit('context-menu', $event, file)"
    @dblclick="emit('open', file)"
  >
    <button class="file-name-cell file-name-button sftp-tree-name" :style="{ paddingLeft: `${file.depth * 16}px` }"
            :title="file.path" @click="file.isDirectory && emit('open', file)">
      <span class="tree-toggle" :class="{ hidden: !file.isDirectory }">
        <template v-if="file.loading">…</template>
        <ChevronRight v-else-if="!file.expanded" :size="14" class="chevron-icon"/>
        <ChevronDown v-else :size="14" class="chevron-icon"/>
      </span>
      <span class="file-icon" :class="{ folder: file.isDirectory, expanded: file.isDirectory && file.expanded }"
            :style="file.isDirectory ? undefined : { color: file.icon.color, background: `${file.icon.color}22` }">
        <span v-if="file.icon.label" class="typed-file-mark">
          <svg class="typed-file-svg" viewBox="0 0 1024 1024" aria-hidden="true">
            <path class="typed-file-page"
                  d="M590.222 73.956l268.8 268.299v533.834c0 37.7-30.566 68.267-68.266 68.267H233.244c-37.7 0-68.266-30.567-68.266-68.267V142.222c0-37.7 30.566-68.266 68.266-68.266h356.978zM578.458 102.4H233.244a39.822 39.822 0 0 0-39.799 38.457l-0.023 1.365V876.09a39.822 39.822 0 0 0 38.457 39.8l1.365 0.022h557.512a39.822 39.822 0 0 0 39.799-38.457l0.023-1.365V354.054L578.458 102.4z"/>
            <path class="typed-file-band"
                  d="M854.756 370.648H639.613c-45.528 0-82.551-36.431-83.507-81.738l-0.017-1.792V73.956h28.444v213.162c0 29.895 23.82 54.232 53.516 55.063l1.564 0.023h215.143v28.444zM85.333 489.244h853.334q28.444 0 28.444 28.445v284.444q0 28.445-28.444 28.445H85.333q-28.444 0-28.444-28.445V517.69q0-28.445 28.444-28.445z"/>
          </svg>
          <span class="typed-file-label">{{ file.icon.label.slice(0, 4) }}</span>
        </span>
        <component v-else :is="iconComponent" :size="20" class="default-file-icon"/>
      </span>
      <strong>{{ file.name }}</strong>
    </button>
    <span class="sftp-info-wrap">
      <button class="sftp-info-button" title="Info" @mouseenter="emit('show-info', $event, file)"
              @mouseleave="emit('hide-info')" @click.stop>i</button>
    </span>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  Link2,
} from '@lucide/vue'
import {computed} from 'vue'
import type {Component} from 'vue'
import type {SftpTreeNode} from '../../types'

const props = defineProps<{
  file: SftpTreeNode
  active: boolean
  dropTarget: boolean
}>()

const emit = defineEmits<{
  (event: 'open', file: SftpTreeNode): void
  (event: 'context-menu', mouseEvent: MouseEvent, file: SftpTreeNode): void
  (event: 'drag-enter', file: SftpTreeNode): void
  (event: 'show-info', mouseEvent: MouseEvent, file: SftpTreeNode): void
  (event: 'hide-info'): void
}>()

const iconMap: Record<string, Component> = {
  'file': File,
  'folder': Folder,
  'link': Link2,
}

const iconComponent = computed(() => {
  if (props.file.isDirectory) {
    return props.file.expanded ? FolderOpen : Folder
  }

  return iconMap[props.file.icon.type] ?? File
})
</script>

<style scoped>
.file-table-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-width: 0;
  min-height: 27px;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--idea-text-muted);
  font-size: 12px;
  transition: border-color var(--motion-fast), background var(--motion-fast), color var(--motion-fast), box-shadow var(--motion-fast);
}

.file-table-row::before {
  position: sticky;
  left: 0;
  z-index: 1;
  align-self: stretch;
  flex: 0 0 2px;
  margin: 4px 0;
  border-radius: 999px;
  background: transparent;
  content: '';
}

.file-table-row:hover {
  border-color: color-mix(in srgb, var(--accent) 18%, transparent);
  background: var(--state-hover);
  color: var(--idea-text);
}

.file-table-row:active {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: #f8fafc;
}

.file-table-row.active {
  border-color: var(--state-border);
  background: linear-gradient(90deg, var(--state-active), transparent 140%);
  color: var(--idea-text);
  box-shadow: inset 3px 0 0 var(--accent), inset 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent);
}

.file-table-row.active::before {
  background: var(--accent);
}

.file-table-row.drop-target {
  border-color: rgba(34, 211, 238, 0.72);
  background: linear-gradient(90deg, rgba(14, 116, 144, 0.34), rgba(59, 130, 246, 0.12));
}

.file-table-row.drop-target::before {
  background: #22d3ee;
}

.file-table-row.drop-target .file-icon {
  background: rgba(14, 165, 233, 0.32);
  color: #e0f2fe;
}

.file-name-cell {
  display: flex;
  flex: 1 1 auto;
  gap: 4px;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}

.file-name-button {
  display: flex;
  gap: 4px;
  align-items: center;
  min-width: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.sftp-row-spacer {
  min-width: 0;
}

.sftp-info-wrap {
  position: sticky;
  right: 0;
  z-index: 2;
  display: flex;
  justify-content: flex-end;
  margin-left: 8px;
  padding: 0 4px;
  background: linear-gradient(90deg, transparent, var(--color-panel, #0f172a) 35%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease;
}

.sftp-tree-row:hover .sftp-info-wrap,
.sftp-info-wrap:hover {
  opacity: 1;
  pointer-events: auto;
}

.sftp-info-button {
  display: grid;
  width: 14px;
  height: 14px;
  place-items: center;
  border: 1px solid rgba(125, 211, 252, 0.32);
  border-radius: 999px;
  background: rgba(14, 116, 144, 0.18);
  color: #7dd3fc;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.tree-toggle {
  display: inline-grid;
  flex: 0 0 auto;
  width: 14px;
  place-items: center;
  color: #7dd3fc;
  font-size: 12px;
}

.tree-toggle.hidden {
  visibility: hidden;
}

.chevron-icon {
  flex: 0 0 auto;
  transition: transform 0.15s ease;
}

.file-name-cell strong {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.file-icon {
  display: grid;
  min-width: 22px;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 6px;
  background: rgba(30, 41, 59, 0.58);
  font-size: 15px;
  font-weight: 700;
  transition: background 0.14s ease, color 0.14s ease, border-color 0.14s ease;
}

.file-icon.folder {
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: color-mix(in srgb, var(--accent) 82%, #dbeafe);
}

.file-icon.folder.expanded {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: color-mix(in srgb, var(--accent) 92%, #ffffff);
}

.typed-file-mark,
.typed-file-svg,
.default-file-icon {
  width: 20px;
  height: 20px;
}

.typed-file-mark {
  position: relative;
  display: block;
}

.typed-file-svg {
  display: block;
}

.typed-file-page,
.typed-file-band {
  fill: currentColor;
}

.typed-file-page {
  opacity: 0.72;
}

.typed-file-band {
  opacity: 1;
}

.typed-file-label {
  position: absolute;
  top: 63.5%;
  left: 50%;
  width: 22px;
  transform: translate(-50%, -50%);
  color: #020617;
  font-family: Inter, "Segoe UI", Arial, sans-serif;
  font-size: 7px;
  font-weight: 750;
  line-height: 1;
  letter-spacing: 0.15px;
  overflow: hidden;
  pointer-events: none;
  text-align: center;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.2);
  text-transform: uppercase;
  white-space: nowrap;
}
</style>
