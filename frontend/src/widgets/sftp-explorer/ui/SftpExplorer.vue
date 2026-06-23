<template>
  <UiWorkbenchPanel :compact="compact" :class="['explorer-panel', 'sftp-explorer', `sftp-explorer--${viewMode}`]" title="SFTP" :subtitle="sftpSubtitle">
    <template #icon><FolderTree :size="15" /></template>
    <template #toolbar>
      <SftpToolbar
        :disabled="!activeSession"
        :loading="sftpState.loading"
        :view-mode="viewMode"
        @mkdir="handleMkdir"
        @refresh="refresh()"
        @up="openParentDirectory"
        @upload="handleUpload"
        @update:view-mode="viewMode = $event"
      />
    </template>
    <div class="explorer-layout sftp-explorer__layout">
      <section class="explorer-utility sftp-explorer__utility">
        <SftpBreadcrumbs :path="sftpState.path" @open="refresh" />
        <small v-if="!activeSession" class="sftp-explorer__hint">Select a connected session to enable remote file actions.</small>
      </section>
      <section class="explorer-content sftp-explorer__body">
        <UiErrorState v-if="sftpState.error" copyable logs-command-id="workspace.openLogsPanel" title="Unable to load remote directory" :message="sftpState.error" retry-label="Retry" @retry="refresh()" />
        <div v-else-if="sftpState.loading" class="sftp-tree sftp-tree--loading" aria-label="Loading remote directory">
          <article v-for="index in 4" :key="index" class="sftp-row skeleton-row">
            <span />
            <strong />
            <small />
            <small />
            <span />
          </article>
        </div>
        <EmptyState
          v-else-if="sftpState.items.length === 0"
          compact
          class="explorer-empty-state sftp-empty-state"
          icon="⇄"
          title="No remote files"
          :description="activeSession ? 'Refresh the current path or upload files into this directory.' : 'Select a connected session to browse remote files.'"
        >
          <template #actions>
            <UiButton v-if="activeSession" size="sm" variant="primary" @click="refresh()">Refresh directory</UiButton>
          </template>
        </EmptyState>
        <SftpDirectoryTree v-else-if="viewMode === 'tree'" :items="sftpState.items" :root-path="sftpState.path" :session="activeSession" />
        <div v-else-if="viewMode === 'split'" class="sftp-split-view">
          <SftpDirectoryPane :items="sftpState.items" @open-directory="refresh" />
          <SftpTree :items="sftpState.items" display-mode="split" @open-directory="refresh" />
        </div>
        <SftpTree v-else :items="sftpState.items" display-mode="list" @open-directory="refresh" />
      </section>
      <SftpTaskMiniPanel />
    </div>
  </UiWorkbenchPanel>
</template>

<script setup lang="ts">
import {FolderTree} from '@lucide/vue'
import {computed} from 'vue'
import {getActiveSession} from '../../../entities/session'
import {createRemoteDirectory, createTransferTask} from '../../../features/sftp/manage-files/manageSftpFiles'
import {requestPrompt} from '../../../shared/dialog'
import {EmptyState, UiButton, UiErrorState, UiWorkbenchPanel} from '../../../shared/ui'
import {useSftpExplorer} from '../model/useSftpExplorer'
import {useSftpViewMode} from '../model/sftpViewMode'
import SftpBreadcrumbs from './SftpBreadcrumbs.vue'
import SftpDirectoryPane from './SftpDirectoryPane.vue'
import SftpDirectoryTree from './SftpDirectoryTree.vue'
import SftpTaskMiniPanel from './SftpTaskMiniPanel.vue'
import SftpToolbar from './SftpToolbar.vue'
import SftpTree from './SftpTree.vue'

defineProps<{compact?: boolean}>()
const {sftpState, refresh, openParentDirectory} = useSftpExplorer()
const {viewMode} = useSftpViewMode()
const activeSession = computed(() => getActiveSession())
const sftpSubtitle = computed(() => activeSession.value ? `${activeSession.value.name} · ${activeSession.value.username}@${activeSession.value.host}:${activeSession.value.port}` : 'No selected session')
async function handleMkdir() {
  const name = await requestPrompt({title: 'Create remote directory', label: 'Directory name', confirmLabel: 'Create'})
  if (name) await createRemoteDirectory(name)
}

async function handleUpload() {
  await createTransferTask('upload', sftpState.path)
}
</script>
