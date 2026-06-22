<template>
  <UiPanel :compact="compact" :class="['sftp-explorer', `sftp-explorer--${viewMode}`]">
    <SftpToolbar
      :loading="sftpState.loading"
      :view-mode="viewMode"
      @mkdir="handleMkdir"
      @refresh="refresh()"
      @up="openParentDirectory"
      @upload="handleUpload"
      @update:view-mode="viewMode = $event"
    />
    <SftpBreadcrumbs :path="sftpState.path" @open="refresh" />
    <UiErrorState v-if="sftpState.error" copyable logs-command-id="workspace.openLogsPanel" title="Unable to load remote directory" :message="sftpState.error" retry-label="Retry" @retry="refresh()" />
    <div v-if="sftpState.loading" class="sftp-tree sftp-tree--loading" aria-label="Loading remote directory">
      <article v-for="index in 6" :key="index" class="sftp-row skeleton-row">
        <span />
        <strong />
        <small />
        <small />
        <span />
      </article>
    </div>
    <EmptyState
      v-else-if="!sftpState.error && sftpState.items.length === 0"
      compact
      icon="⇄"
      title="No remote files"
      description="Choose a connected session, refresh the current path, or upload files into this directory."
    />
    <div v-else-if="viewMode === 'split'" class="sftp-split-view">
      <SftpDirectoryPane :items="sftpState.items" @open-directory="refresh" />
      <SftpTree :items="sftpState.items" @open-directory="refresh" />
    </div>
    <SftpTree v-else :items="visibleItems" :display-mode="viewMode" @open-directory="refresh" />
    <SftpTaskMiniPanel />
  </UiPanel>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {createRemoteDirectory, createTransferTask} from '../../../features/sftp/manage-files/manageSftpFiles'
import {requestPrompt} from '../../../shared/dialog'
import {EmptyState, UiErrorState, UiPanel} from '../../../shared/ui'
import {useSftpExplorer} from '../model/useSftpExplorer'
import {useSftpViewMode} from '../model/sftpViewMode'
import SftpBreadcrumbs from './SftpBreadcrumbs.vue'
import SftpDirectoryPane from './SftpDirectoryPane.vue'
import SftpTaskMiniPanel from './SftpTaskMiniPanel.vue'
import SftpToolbar from './SftpToolbar.vue'
import SftpTree from './SftpTree.vue'

defineProps<{compact?: boolean}>()
const {sftpState, refresh, openParentDirectory} = useSftpExplorer()
const {viewMode} = useSftpViewMode()
const visibleItems = computed(() => viewMode.value === 'tree' ? sftpState.items.filter((item) => item.type === 'directory') : sftpState.items)

async function handleMkdir() {
  const name = await requestPrompt({title: 'Create remote directory', label: 'Directory name', confirmLabel: 'Create'})
  if (name) await createRemoteDirectory(name)
}

async function handleUpload() {
  await createTransferTask('upload', sftpState.path)
}
</script>
