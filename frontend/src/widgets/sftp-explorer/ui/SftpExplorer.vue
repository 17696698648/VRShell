<template>
  <UiWorkbenchPanel :compact="compact" :class="panelClasses" :title="messages.sftp.explorer.title"
                    :subtitle="sftpSubtitle">
    <template #toolbar>
      <SftpToolbar
        :disabled="!hasConnectedTerminal"
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
          </template>
        </EmptyState>
        <SftpDirectoryTree v-else-if="viewMode === 'tree'" :key="activeSession?.id ?? 'no-session'"
                           :items="sftpState.items" :root-path="sftpState.path" :session="activeSession"
                           @select-directory="selectedTreePath = $event"/>
        <SftpFileList v-else :items="sftpState.items" display-mode="list" @open-directory="refresh"/>
      </section>
    </div>
  </UiWorkbenchPanel>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {createRemoteDirectory, uploadFileToRemoteDirectory} from '../../../features/sftp/manage-files/manageSftpFiles'
import {messages} from '../../../shared/copy'
import {requestPrompt} from '../../../shared/dialog'
import {EmptyState, UiButton, UiErrorState, UiWorkbenchPanel} from '../../../shared/ui'
import {getSftpBodyState} from '../model/sftpBodyState'
import {useSftpExplorer} from '../model/useSftpExplorer'
import {useSftpViewMode} from '../model/sftpViewMode'
import SftpBreadcrumbs from './SftpBreadcrumbs.vue'
import SftpDirectoryTree from './SftpDirectoryTree.vue'
import SftpToolbar from './SftpToolbar.vue'
import SftpFileList from './SftpFileList.vue'

defineProps<{ compact?: boolean }>()
const {sftpState, activeSession, hasConnectedTerminal, refresh, openParentDirectory} = useSftpExplorer()
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

async function handleMkdir() {
  const name = await requestPrompt({
    title: messages.sftp.explorer.createRemoteDirectoryTitle,
    label: messages.sftp.explorer.directoryName,
    confirmLabel: messages.sftp.dialogs.create
  })
  if (name) await createRemoteDirectory(name)
}

async function handleUpload() {
  await uploadFileToRemoteDirectory(sftpState.path)
}
</script>
