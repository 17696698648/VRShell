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
      <div v-if="activeFile" class="session-editor-area__actions">
        <span v-if="activeFile.error" class="session-editor-area__status danger">{{ activeFile.error }}</span>
        <span v-else-if="activeFile.dirty" class="session-editor-area__status">Unsaved changes</span>
        <span v-else class="session-editor-area__status success">Saved</span>
        <UiButton size="sm" variant="primary" :loading="activeFile.saving" :disabled="!activeFile.dirty" @click="saveActiveFile">Save</UiButton>
      </div>
    </header>
    <textarea v-if="activeFile" class="session-editor-area__pane" spellcheck="false" :value="activeFile.content" @input="updateActiveFileContent" @keydown="handleEditorKeydown" />
    <pre v-else class="session-editor-area__pane"><code /></pre>
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {activateSessionEditorFile, closeSessionEditorFile, getSessionEditorFile, getSessionEditorFiles, updateSessionEditorFileContent} from '../../../entities/editor'
import {saveRemoteEditorFile} from '../../../features/sftp/manage-files/manageSftpFiles'
import {requestConfirm} from '../../../shared/dialog'
import {UiButton, UiTabs, type UiTabItem} from '../../../shared/ui'

const props = defineProps<{sessionId: string}>()
const activeFile = computed(() => getSessionEditorFile(props.sessionId))
const tabItems = computed<UiTabItem[]>(() => getSessionEditorFiles(props.sessionId).map((file) => ({id: file.id, title: fileName(file.path, file.title), closable: true, dirty: file.dirty})))

function activateFile(fileId: string) {
  activateSessionEditorFile(props.sessionId, fileId)
}

async function closeFile(fileId: string) {
  const file = getSessionEditorFiles(props.sessionId).find((item) => item.id === fileId)
  if (file?.dirty) {
    const confirmed = await requestConfirm({
      title: 'Discard unsaved changes?',
      message: `${fileName(file.path, file.title)} has unsaved changes. Close it without saving?`,
      confirmLabel: 'Discard',
      cancelLabel: 'Keep editing',
      tone: 'danger',
    })
    if (!confirmed) return
  }
  closeSessionEditorFile(props.sessionId, fileId)
}

function updateActiveFileContent(event: Event) {
  if (!activeFile.value) return
  updateSessionEditorFileContent(activeFile.value.id, (event.target as HTMLTextAreaElement).value)
}

async function saveActiveFile() {
  if (activeFile.value?.dirty && !activeFile.value.saving) await saveRemoteEditorFile(activeFile.value)
}

function handleEditorKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void saveActiveFile()
  }
}

function fileName(path: string, fallback: string) {
  return path.split('/').filter(Boolean).pop() ?? fallback
}
</script>
