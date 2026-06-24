<template>
  <UiWorkbenchPanel :compact="compact" :class="['explorer-panel', 'sftp-explorer', `sftp-explorer--${viewMode}`]" :title="messages.sftp.explorer.title" :subtitle="sftpSubtitle">
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
        <small v-if="!activeSession" class="sftp-explorer__hint">{{ messages.sftp.explorer.hint }}</small>
      </section>
      <section class="explorer-content sftp-explorer__body">
        <UiErrorState v-if="sftpState.error" copyable logs-command-id="workspace.openLogsPanel" :title="messages.sftp.explorer.unableToLoadDirectory" :message="sftpState.error" :retry-label="messages.sftp.explorer.retry" @retry="refresh()" />
        <div v-else-if="sftpState.loading" class="sftp-tree sftp-tree--loading" :aria-label="messages.sftp.explorer.loadingDirectory">
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
          :title="messages.sftp.explorer.emptyTitle"
          :description="activeSession ? messages.sftp.explorer.emptyWithSession : messages.sftp.explorer.emptyWithoutSession"
        >
          <template #actions>
            <UiButton v-if="activeSession" size="sm" variant="primary" @click="refresh()">{{ messages.sftp.explorer.refreshDirectory }}</UiButton>
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
import {createRemoteDirectory, uploadFileToRemoteDirectory} from '../../../features/sftp/manage-files/manageSftpFiles'
import {messages} from '../../../shared/copy'
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
const sftpSubtitle = computed(() => activeSession.value ? `${activeSession.value.name} · ${activeSession.value.username}@${activeSession.value.host}:${activeSession.value.port}` : messages.sftp.explorer.noSelectedSession)
async function handleMkdir() {
  const name = await requestPrompt({title: messages.sftp.explorer.createRemoteDirectoryTitle, label: messages.sftp.explorer.directoryName, confirmLabel: messages.sftp.dialogs.create})
  if (name) await createRemoteDirectory(name)
}

async function handleUpload() {
  await uploadFileToRemoteDirectory(sftpState.path)
}
</script>
