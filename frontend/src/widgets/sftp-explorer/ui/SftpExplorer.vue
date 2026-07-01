<template>
  <UiWorkbenchPanel :compact="compact" :class="panelClasses" :title="messages.sftp.explorer.title"
                    :subtitle="sftpSubtitle">
    <template #actions>
      <SftpToolbar
        :disabled="!hasConnectedTerminal"
        :loading="sftpState.loading"
        :view-mode="viewMode"
        @mkdir="handleMkdir"
        @new-file="handleNewFile"
        @refresh="refresh()"
        @upload="handleUpload"
        @upload-folder="handleUploadFolder"
        @update:view-mode="viewMode = $event"
      />
    </template>
    <div class="explorer-layout sftp-explorer__layout">
      <section class="explorer-utility sftp-pathbar">
        <SftpBreadcrumbs :path="breadcrumbPath" @open="openBreadcrumbPath"/>
      </section>
      <section class="explorer-content sftp-explorer__body">
        <UiErrorState v-if="sftpBodyState.kind === 'error'" copyable logs-command-id="workspace.openLogsPanel"
                      :title="sftpBodyState.title" :message="sftpBodyState.description"
                      :retry-label="messages.sftp.explorer.retry" @retry="refresh()"/>
        <div v-else-if="sftpBodyState.kind === 'loading'" class="sftp-file-list sftp-file-list--loading"
             :aria-label="sftpBodyState.title">
          <article v-for="index in 4" :key="index" class="sftp-file-row skeleton-row">
            <span/>
            <strong/>
            <small/>
            <small/>
            <span/>
          </article>
        </div>
        <EmptyState
          v-else-if="sftpBodyState.kind === 'empty' || sftpBodyState.kind === 'disconnected'"
          compact
          class="explorer-empty-state sftp-empty-state"
          :icon="sftpBodyState.icon"
          :title="sftpBodyState.title"
          :description="sftpBodyState.description"
        >
          <template #actions>
            <UiButton v-if="sftpBodyState.kind === 'empty'" size="sm" variant="primary" @click="refresh()">
              {{ messages.sftp.explorer.refreshDirectory }}
            </UiButton>
            <UiButton v-else-if="sftpBodyState.kind === 'disconnected' && activeSession" size="sm" variant="primary" @click="reconnectSession()">
              {{ messages.reconnect.action }}
            </UiButton>
          </template>
        </EmptyState>
        <SftpDirectoryTree v-else-if="viewMode === 'tree'" :key="activeSession?.id ?? 'no-session'"
                           :items="sftpState.items" :root-path="sftpState.path" :session="activeSession"
                           @select-directory="selectedTreePath = $event"/>
        <template v-else>
          <SftpFileList :items="sftpState.items" display-mode="list" @open-directory="refresh"/>
          <div v-if="sftpBodyState.kind === 'ready' && sftpState.hasMore" class="sftp-pagination-action">
            <UiButton size="sm" variant="secondary" :disabled="sftpState.loading" @click="loadMore()">
              {{ messages.sftp.explorer.loadMoreDirectory }}
            </UiButton>
          </div>
        </template>
      </section>
    </div>
  </UiWorkbenchPanel>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {createRemoteDirectory, createRemoteFile, uploadFileToRemoteDirectory, uploadFolderToRemoteDirectory} from '../../../features/sftp/manage-files/manageSftpFiles'
import {executeCommand} from '../../../shared/command'
import {messages} from '../../../shared/copy'
import {requestPrompt} from '../../../shared/dialog'
import type {SftpTransferOptions} from '../../../shared/ipc/ipcFacade'
import {EmptyState, UiButton, UiErrorState, UiWorkbenchPanel} from '../../../shared/ui'
import {getSftpBodyState} from '../model/sftpBodyState'
import {useSftpExplorer} from '../model/useSftpExplorer'
import {useSftpViewMode} from '../model/sftpViewMode'
import SftpBreadcrumbs from './SftpBreadcrumbs.vue'
import SftpDirectoryTree from './SftpDirectoryTree.vue'
import SftpToolbar from './SftpToolbar.vue'
import SftpFileList from './SftpFileList.vue'

type SftpUploadConflictStrategy = NonNullable<SftpTransferOptions['conflict']>

defineProps<{ compact?: boolean }>()
const {sftpState, activeSession, hasConnectedTerminal, refresh, loadMore} = useSftpExplorer()
const {viewMode} = useSftpViewMode()
const selectedTreePath = ref<string | null>(null)
const panelClasses = computed(() => ['explorer-panel', 'sftp-explorer', `sftp-explorer--${viewMode.value}`])
const sftpSubtitle = computed(() => activeSession.value ? `${activeSession.value.name} · ${activeSession.value.username}@${activeSession.value.host}:${activeSession.value.port}` : messages.sftp.explorer.noSelectedSession)
const breadcrumbPath = computed(() => viewMode.value === 'tree' ? selectedTreePath.value ?? sftpState.path : sftpState.path)
const sftpBodyState = computed(() => getSftpBodyState({
  activeSession: hasConnectedTerminal.value,
  copy: messages.sftp.explorer,
  error: sftpState.error,
  itemCount: sftpState.items.length,
  loading: sftpState.loading
}))

watch(() => [activeSession.value?.id, sftpState.path] as const, () => {
  selectedTreePath.value = null
})

function openBreadcrumbPath(path: string) {
  selectedTreePath.value = null
  return refresh(path)
}

function reconnectSession() {
  if (!activeSession.value) return
  return executeCommand('session.reconnect', {sessionId: activeSession.value.id})
}

async function handleMkdir() {
  const name = await requestPrompt({
    title: messages.sftp.explorer.createRemoteDirectoryTitle,
    label: messages.sftp.explorer.directoryName,
    confirmLabel: messages.sftp.dialogs.create
  })
  if (!name) return
  await createRemoteDirectory(name)
  await refresh()
}

async function handleNewFile() {
  const name = await requestPrompt({
    title: messages.sftp.dialogs.newRemoteFileTitle,
    label: messages.sftp.dialogs.fileName,
    confirmLabel: messages.sftp.dialogs.create
  })
  if (!name) return
  await createRemoteFile(name)
  await refresh()
}

async function handleUpload(conflict: SftpUploadConflictStrategy) {
  const item = await uploadFileToRemoteDirectory(sftpState.path, {conflict})
  if (item) await refresh()
}

async function handleUploadFolder() {
  const item = await uploadFolderToRemoteDirectory(sftpState.path)
  if (item) await refresh()
}
</script>
