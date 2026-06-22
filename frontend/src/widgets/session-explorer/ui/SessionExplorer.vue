<template>
  <UiWorkbenchPanel compact class="session-explorer" title="Sessions" subtitle="SSH inventory">
    <template #icon><Server :size="15" /></template>
    <template #toolbar>
      <SessionToolbar :form-open="formOpen" @create="openCreateDialog()" @create-group="handleCreateGroup" @import-ssh-config="handleImport" />
    </template>
    <SessionSearchBox v-model="query" />
    <p v-if="message" class="panel-message">{{ message }}</p>
    <SessionTree :groups="groups" :sessions="filteredSessions" @create="openCreateDialog" @edit="editingSession = $event" />
    <SessionCreateForm v-if="formOpen" @close="closeCreateDialog" @submit="handleCreate" />
    <SessionEditDialog v-if="editingSession" :session="editingSession" @close="editingSession = null" />
  </UiWorkbenchPanel>
</template>

<script setup lang="ts">
import {Server} from '@lucide/vue'
import {ref} from 'vue'
import type {SessionGroup, SessionHost} from '../../../entities/session'
import {connectSession} from '../../../features/session/connect-session/connectSession'
import {createSession, type CreateSessionInput} from '../../../features/session/create-session/createSession'
import {importSshConfigSessions, type ImportSshConfigSummary} from '../../../features/session/create-session/importSshConfigSessions'
import {createSessionGroup} from '../../../features/session/manage-groups/manageSessionGroups'
import {UiWorkbenchPanel} from '../../../shared/ui'
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

async function handleCreate(input: CreateSessionInput) {
  try {
    const session = createSession(input, targetGroupId.value)
    await connectSession(session)
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
</script>
