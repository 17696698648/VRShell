<template>
  <UiWorkbenchPanel compact class="explorer-panel session-explorer" title="Sessions" subtitle="SSH inventory">
    <template #icon><Server :size="14" /></template>
    <template #toolbar>
      <SessionToolbar :form-open="formOpen" @create="openCreateDialog()" @create-group="handleCreateGroup" />
    </template>
    <div class="explorer-layout session-explorer__layout">
      <section class="explorer-utility session-explorer__search">
        <SessionSearchBox v-model="query" :result-count="filteredSessions.length" />
      </section>
      <section class="explorer-content session-explorer__body">
        <EmptyState v-if="showEmptyState" compact class="session-empty-state" :icon="emptyState.icon" :title="emptyState.title" :description="emptyState.description">
          <template #actions>
            <UiButton v-if="emptyState.kind === 'search'" size="sm" variant="ghost" @click="query = ''">Clear search</UiButton>
            <template v-else>
              <UiButton size="sm" variant="primary" @click="openCreateDialog()">New session</UiButton>
              <UiButton size="sm" variant="ghost" @click="handleImport">Import SSH config</UiButton>
            </template>
          </template>
        </EmptyState>
        <SessionTree v-else :filtering="Boolean(query)" :groups="groups" :sessions="filteredSessions" @create="openCreateDialog" @edit="editingSession = $event" />
      </section>
      <section v-if="message" class="session-explorer__feedback" role="status">{{ message }}</section>
    </div>
    <SessionCreateForm v-if="formOpen" @close="closeCreateDialog" @submit="handleCreate" />
    <SessionEditDialog v-if="editingSession" :session="editingSession" @close="editingSession = null" />
  </UiWorkbenchPanel>
</template>

<script setup lang="ts">
import {Server} from '@lucide/vue'
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {patchSession, type SessionGroup, type SessionHost} from '../../../entities/session'
import {connectSession} from '../../../features/session/connect-session/connectSession'
import {createSession, type CreateSessionInput} from '../../../features/session/create-session/createSession'
import {importSshConfigSessions, type ImportSshConfigSummary} from '../../../features/session/create-session/importSshConfigSessions'
import {persistSessionAuth} from '../../../features/session/manage-credentials/sessionCredentials'
import {createSessionGroup} from '../../../features/session/manage-groups/manageSessionGroups'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'
import {EmptyState, UiButton, UiWorkbenchPanel} from '../../../shared/ui'
import {getSessionExplorerEmptyState} from '../model/sessionExplorerEmptyState'
import {useSessionExplorer} from '../model/useSessionExplorer'
import SessionCreateForm from './SessionCreateForm.vue'
import SessionEditDialog from './SessionEditDialog.vue'
import SessionSearchBox from './SessionSearchBox.vue'
import SessionToolbar from './SessionToolbar.vue'
import SessionTree from './SessionTree.vue'

const {query, filteredSessions, groups} = useSessionExplorer()
const message = ref('')
const formOpen = ref(false)
const targetGroupId = ref('all')
const editingSession = ref<SessionHost | null>(null)
const showEmptyState = computed(() => filteredSessions.value.length === 0)
const emptyState = computed(() => getSessionExplorerEmptyState(query.value))
let messageTimer: ReturnType<typeof window.setTimeout> | null = null

watch(message, (value) => {
  if (messageTimer) window.clearTimeout(messageTimer)
  if (!value) return
  messageTimer = window.setTimeout(() => {
    message.value = ''
    messageTimer = null
  }, 2000)
})

onBeforeUnmount(() => {
  if (messageTimer) window.clearTimeout(messageTimer)
})

async function handleCreate(input: CreateSessionInput) {
  try {
    const session = createSession(input, targetGroupId.value)
    const auth = await persistSessionAuth(session.id, session.auth ?? {type: 'agent'})
    patchSession(session.id, {auth})
    await connectSession({...session, auth})
    formOpen.value = false
    message.value = `Connected ${session.name}`
  } catch (error) {
    message.value = getErrorMessage(error)
  }
}

function openCreateDialog(group?: SessionGroup) {
  targetGroupId.value = group?.id ?? 'all'
  formOpen.value = true
}

function closeCreateDialog() {
  formOpen.value = false
  targetGroupId.value = 'all'
}

async function handleCreateGroup() {
  const group = await createSessionGroup()
  if (group) message.value = `Created group ${group.name}`
}

async function handleImport() {
  try {
    const summary = await importSshConfigSessions()
    message.value = formatImportSummary(summary)
  } catch (error) {
    message.value = getErrorMessage(error)
  }
}

function formatImportSummary(summary: ImportSshConfigSummary) {
  if (summary.imported === 0 && summary.skipped === 0) return 'No SSH config hosts found'
  if (summary.skipped === 0) return `Imported ${summary.imported} SSH config hosts`
  return `Imported ${summary.imported} SSH config hosts, skipped ${summary.skipped} invalid or duplicate hosts`
}

</script>
