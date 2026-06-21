<template>
  <section class="panel session-explorer">
    <SessionToolbar :form-open="formOpen" @create="formOpen = !formOpen" @create-group="handleCreateGroup" @import-ssh-config="handleImport" />
    <SessionCreateForm v-if="formOpen" @submit="handleCreate" />
    <SessionSearchBox v-model="query" />
    <p v-if="message" class="panel-message">{{ message }}</p>
    <SessionTree :groups="groups" :sessions="filteredSessions" @edit="editingSession = $event" />
    <SessionEditDialog v-if="editingSession" :session="editingSession" @close="editingSession = null" />
  </section>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import type {SessionHost} from '../../../entities/session'
import {connectSession} from '../../../features/session/connect-session/connectSession'
import {createSession, type CreateSessionInput} from '../../../features/session/create-session/createSession'
import {importSshConfigSessions, type ImportSshConfigSummary} from '../../../features/session/create-session/importSshConfigSessions'
import {createSessionGroup} from '../../../features/session/manage-groups/manageSessionGroups'
import {useSessionExplorer} from '../model/useSessionExplorer'
import SessionCreateForm from './SessionCreateForm.vue'
import SessionEditDialog from './SessionEditDialog.vue'
import SessionSearchBox from './SessionSearchBox.vue'
import SessionToolbar from './SessionToolbar.vue'
import SessionTree from './SessionTree.vue'

const {query, filteredSessions, groups} = useSessionExplorer()
const message = ref('')
const formOpen = ref(false)
const editingSession = ref<SessionHost | null>(null)

async function handleCreate(input: CreateSessionInput) {
  try {
    const session = createSession(input)
    await connectSession(session)
    formOpen.value = false
    message.value = `Connected ${session.name}`
  } catch (error) {
    message.value = getErrorMessage(error)
  }
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
