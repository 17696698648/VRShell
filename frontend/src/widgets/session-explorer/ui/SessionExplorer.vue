<template>
  <UiWorkbenchPanel compact class="session-explorer" title="Sessions" subtitle="SSH inventory">
    <template #icon><Server :size="14" /></template>
    <template #toolbar>
      <SessionToolbar :form-open="formOpen" @create="openCreateDialog()" @create-group="handleCreateGroup" />
    </template>
    <div class="session-explorer__layout">
      <section class="session-explorer__search">
        <SessionSearchBox v-model="query" :result-count="filteredSessions.length" />
      </section>
      <section class="session-explorer__body">
        <div v-if="showEmptyState" class="session-empty-state" :class="{'session-empty-state--search': Boolean(query)}">
          <Server :size="28" />
          <strong>{{ query ? 'No matching sessions' : 'No sessions yet' }}</strong>
          <small>{{ query ? `No sessions match “${query}”.` : 'Create a session or import your SSH config to get started.' }}</small>
          <div class="session-empty-state__actions">
            <button v-if="query" type="button" class="ui-button ghost sm" @click="query = ''">Clear search</button>
            <template v-else>
              <button type="button" class="ui-button primary sm" @click="openCreateDialog()">New session</button>
              <button type="button" class="ui-button ghost sm" @click="handleImport">Import SSH config</button>
            </template>
          </div>
        </div>
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
const showEmptyState = computed(() => filteredSessions.value.length === 0)
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
