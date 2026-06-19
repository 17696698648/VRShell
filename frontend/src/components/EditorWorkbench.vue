<template>
  <section v-if="showEditorArea" class="editor-pane">
    <div class="pane-tabs editor-tabs workspace-tab-bar">
      <button
        v-for="file in editorTabs"
        :key="file.path"
        class="pane-tab editor-file-tab workspace-tab-item"
        :class="{ selected: file.selected, dirty: file.dirty }"
        :title="file.path"
        @click="$emit('select-file', file.path)"
        @contextmenu="$emit('open-tab-menu', $event, file.path)"
      >
        <span class="pane-tab-title workspace-tab-title">{{ file.name }}</span>
        <span v-if="file.dirty" class="dirty-dot" title="Unsaved changes"></span>
        <span class="pane-tab-close workspace-tab-close" role="button" tabindex="0" title="Close" @click.stop="$emit('close-file', file.path)"><X :size="12"/></span>
      </button>
      <select v-if="editorTabs.length > 1" class="tab-more-select workspace-tab-control" title="More editor tabs" @change="$emit('more-select', $event)">
        <option value="">More ?</option>
        <option v-for="file in editorTabs" :key="'more-' + file.path" :value="file.path">
          {{ file.dirty ? '* ' : '' }}{{ file.name }}
        </option>
      </select>
    </div>

    <div class="editor-surface">
      <CodeMirrorEditor
        v-if="activeEditorFile"
        :key="activeEditorFile.path"
        :model-value="activeEditorFile.content"
        :language="activeEditorFile.language"
        :path="activeEditorFile.path"
        @update:model-value="$emit('update-active-file', $event)"
        @save="$emit('save-active-file')"
      />
      <div v-else class="editor-empty">
        <EmptyState
          title="No file selected"
          description="Double-click a file in SFTP to open it here, or use the command palette to start a workflow."
        >
          <template #icon>?</template>
          <template #actions>
            <UiButton title="Open command palette" v-tooltip="'Open command palette'" aria-label="Open command palette" @click="$emit('open-quick-open')">
              Quick open
            </UiButton>
            <UiButton title="Show SFTP drawer" v-tooltip="'Show SFTP drawer'" aria-label="Show SFTP drawer" @click="$emit('show-sftp')">
              Show SFTP
            </UiButton>
          </template>
        </EmptyState>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {X} from '@lucide/vue'
import CodeMirrorEditor from './CodeMirrorEditor.vue'
import {EmptyState, UiButton} from './ui'
import type {EditorFile} from '../types'

defineProps<{
  showEditorArea: boolean
  editorTabs: EditorFile[]
  activeEditorFile?: EditorFile | null
}>()

defineEmits<{
  (event: 'select-file', path: string): void
  (event: 'open-tab-menu', mouseEvent: MouseEvent, path: string): void
  (event: 'close-file', path: string): void
  (event: 'more-select', domEvent: Event): void
  (event: 'update-active-file', value: string): void
  (event: 'save-active-file'): void
  (event: 'open-quick-open'): void
  (event: 'show-sftp'): void
}>()
</script>

<style scoped>
.editor-pane {
  display: grid;
  grid-template-rows: 34px minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
  border-bottom: 1px solid var(--idea-border);
  background: var(--workspace-bg);
}

.pane-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 34px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 6px;
  box-sizing: border-box;
  border-bottom: 1px solid #111418;
  background: #1b1d21;
  scrollbar-width: none;
}

.pane-tabs::-webkit-scrollbar {
  display: none;
}

.pane-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  height: 26px;
  flex: 0 1 auto;
  max-width: 200px;
  min-width: 0;
  padding: 0 12px;
  margin: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: rgba(39,43,49,0.46);
  color: #9ba7b7;
  font-size: 12px;
  line-height: 1;
  transition: border-color var(--motion-fast), background var(--motion-fast), color var(--motion-fast), box-shadow var(--motion-fast);
}

.pane-tab.selected,
.pane-tab:hover {
  border-color: rgba(72,98,125,0.82);
  background: linear-gradient(180deg, rgba(41,65,94,0.78) 0%, rgba(32,54,80,0.72) 100%);
  color: #8ec7ff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 12px rgba(0,0,0,0.18);
}

.pane-tab-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pane-tab-close {
  display: grid;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  place-items: center;
  border-radius: 5px;
  color: #94a3b8;
  line-height: 1;
  opacity: 0.78;
  transition: opacity var(--motion-fast), background var(--motion-fast), color var(--motion-fast);
}

.pane-tab-close svg {
  display: block;
  width: 12px;
  height: 12px;
  stroke: currentColor;
}

.pane-tab:hover .pane-tab-close,
.pane-tab.selected .pane-tab-close {
  opacity: 1;
  color: #cbd5e1;
}

.pane-tab-close:hover {
  background: var(--danger-soft);
  color: var(--danger-text);
  opacity: 1;
}

.dirty-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--status-warning);
  box-shadow: 0 0 8px color-mix(in srgb, var(--status-warning) 48%, transparent);
}

.pane-tab.dirty .pane-tab-title {
  color: #fde68a;
}

.tab-more-select {
  flex: 0 0 auto;
  max-width: 112px;
  height: 26px;
  padding: 0 22px 0 10px;
  border: 1px solid rgba(72,98,125,0.72);
  border-radius: 6px;
  background: rgba(39,43,49,0.46);
  color: #9ba7b7;
  font-size: 11px;
  font-weight: 700;
  outline: 0;
  cursor: pointer;
}

.tab-more-select:hover,
.tab-more-select:focus {
  border-color: rgba(72,98,125,0.82);
  background: linear-gradient(180deg, rgba(41,65,94,0.78) 0%, rgba(32,54,80,0.72) 100%);
  color: #8ec7ff;
}
</style>
