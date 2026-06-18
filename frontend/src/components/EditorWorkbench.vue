<template>
  <section v-if="showEditorArea" class="editor-pane">
    <div class="pane-tabs editor-tabs">
      <button
        v-for="file in editorTabs"
        :key="file.path"
        class="pane-tab editor-file-tab"
        :class="{ selected: file.selected, dirty: file.dirty }"
        :title="file.path"
        @click="$emit('select-file', file.path)"
        @contextmenu="$emit('open-tab-menu', $event, file.path)"
      >
        <span class="pane-tab-title">{{ file.name }}</span>
        <span v-if="file.dirty" class="dirty-dot" title="Unsaved changes"></span>
        <span class="pane-tab-close" title="Close" @click.stop="$emit('close-file', file.path)"><X :size="12"/></span>
      </button>
      <select v-if="editorTabs.length > 1" class="tab-more-select" title="More editor tabs" @change="$emit('more-select', $event)">
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
