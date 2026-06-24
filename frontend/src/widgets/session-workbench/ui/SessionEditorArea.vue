<template>
  <section class="session-editor-area">
    <header class="session-editor-area__header session-terminal-tabs-bar">
      <UiTabs class="session-editor-area__tabs session-terminal-tabs" :active-id="activeFile?.id ?? null" :items="tabItems" label="Open editor files" @activate="activateFile" @close="closeFile">
        <template #item="{item}">
          <span class="session-terminal-tabs__identity">
            <span class="session-editor-area__tab-title session-terminal-tabs__title">{{ item.title }}</span>
          </span>
        </template>
      </UiTabs>
    </header>
    <pre class="session-editor-area__pane"><code>{{ activeFile?.content ?? '' }}</code></pre>
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {activateSessionEditorFile, closeSessionEditorFile, getSessionEditorFile, getSessionEditorFiles} from '../../../entities/editor'
import {UiTabs, type UiTabItem} from '../../../shared/ui'

const props = defineProps<{sessionId: string}>()
const activeFile = computed(() => getSessionEditorFile(props.sessionId))
const tabItems = computed<UiTabItem[]>(() => getSessionEditorFiles(props.sessionId).map((file) => ({id: file.id, title: fileName(file.path, file.title), closable: true})))

function activateFile(fileId: string) {
  activateSessionEditorFile(props.sessionId, fileId)
}

function closeFile(fileId: string) {
  closeSessionEditorFile(props.sessionId, fileId)
}

function fileName(path: string, fallback: string) {
  return path.split('/').filter(Boolean).pop() ?? fallback
}
</script>
