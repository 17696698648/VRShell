<template>
  <section class="welcome-page" aria-labelledby="welcome-title">
    <div class="welcome-page__hero">
      <span class="welcome-page__mark" aria-hidden="true"><TerminalSquare :size="30" /></span>
      <p class="welcome-page__eyebrow">Remote workspace</p>
      <h1 id="welcome-title">Welcome to VRShell</h1>
      <p class="welcome-page__lead">Connect to SSH hosts, manage remote files, run tasks, and keep terminals organized in one IDE-style shell.</p>
      <div class="welcome-page__actions">
        <UiButton variant="primary" @click="executeCommand('session.createQuick')"><Server :size="15" /> New SSH Session</UiButton>
        <UiButton variant="secondary" @click="executeCommand('session.importSshConfig')"><Upload :size="15" /> Import SSH Config</UiButton>
        <UiButton variant="ghost" @click="executeCommand('workspace.openCommandPalette')"><Search :size="15" /> Command Palette</UiButton>
      </div>
    </div>
    <div class="welcome-page__cards" aria-label="Getting started">
      <button v-for="entry in productEntries" :key="entry.title" type="button" class="welcome-page__card" @click="executeCommand(entry.command)">
        <component :is="entry.icon" :size="18" aria-hidden="true" />
        <strong>{{ entry.title }}</strong>
        <span>{{ entry.description }}</span>
      </button>
    </div>
    <div class="welcome-page__recent" aria-label="Recent workspace activity">
      <article v-for="section in recentSections" :key="section.title" class="welcome-page__recent-section">
        <strong>{{ section.title }}</strong>
        <span>{{ section.value }}</span>
      </article>
    </div>
    <p class="welcome-page__hint">Tip: press <UiKbd label="Ctrl+P" /> to search commands and sessions.</p>
  </section>
</template>

<script setup lang="ts">
import {FolderTree, ListTodo, Search, Server, TerminalSquare, Upload} from '@lucide/vue'
import {computed} from 'vue'
import {sessionState} from '../../entities/session'
import {sftpState} from '../../entities/sftp'
import {taskItems} from '../../entities/task'
import {executeCommand} from '../../features/workspace/command-registry'
import {UiButton, UiKbd} from '../../shared/ui'

const productEntries = [
  {command: 'workspace.openSessionsPanel', description: 'Review live connections and reconnect failed hosts.', icon: Server, title: 'Sessions'},
  {command: 'sftp.openPanel', description: 'Browse, upload, download, and rename remote files.', icon: FolderTree, title: 'SFTP Explorer'},
  {command: 'workspace.openTasksPanel', description: 'Track long-running jobs and transfer tasks.', icon: ListTodo, title: 'Task Center'},
]
const recentSections = computed(() => [
  {title: 'Recent connection', value: sessionState.sessions[0]?.name ?? 'Create your first SSH session'},
  {title: 'Recent path', value: sftpState.path || 'Open SFTP to browse remote files'},
  {title: 'Recent task', value: taskItems[0]?.title ?? 'Run a transfer or long task'},
])
</script>
