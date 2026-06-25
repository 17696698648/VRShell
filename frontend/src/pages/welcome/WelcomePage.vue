<template>
  <section class="welcome-page" aria-labelledby="welcome-title">
    <div class="welcome-page__hero">
      <span class="welcome-page__mark" aria-hidden="true"><TerminalSquare :size="30" /></span>
      <div class="welcome-page__badges" aria-label="Workspace status">
        <span class="welcome-page__badge welcome-page__badge--accent">SSH ready</span>
        <span class="welcome-page__badge">SFTP explorer</span>
        <span class="welcome-page__badge">Task center</span>
      </div>
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
        <span class="welcome-page__recent-icon" :class="section.tone" aria-hidden="true"><component :is="section.icon" :size="15" /></span>
        <div>
          <strong>{{ section.title }}</strong>
          <span>{{ section.value }}</span>
        </div>
        <small>{{ section.status }}</small>
        <!-- Quick connect button for recent sessions -->
        <button
          v-if="section.sessionId"
          type="button"
          class="welcome-page__quick-connect"
          @click="reconnectSession(section.sessionId)"
          title="Reconnect to this session"
        >
          <Server :size="14" />
        </button>
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
import {terminalState} from '../../entities/terminal'
import {executeCommand} from '../../shared/command'
import {UiButton, UiKbd} from '../../shared/ui'

const productEntries = [
  {command: 'workspace.openSessionsPanel', description: 'Review live connections and reconnect failed hosts.', icon: Server, title: 'Sessions'},
  {command: 'sftp.openPanel', description: 'Browse, upload, download, and rename remote files.', icon: FolderTree, title: 'SFTP Explorer'},
  {command: 'workspace.openTasksPanel', description: 'Track long-running jobs and transfer tasks.', icon: ListTodo, title: 'Task Center'},
]

/** Sessions sorted by most recently used (based on terminal tab order, last active first) */
const sessionsByRecency = computed(() => {
  const seen = new Set<string>()
  const ordered: string[] = []
  // Walk tabs in reverse so the most recently opened/active appears first
  for (let i = terminalState.tabs.length - 1; i >= 0; i--) {
    const sid = terminalState.tabs[i].sessionId
    if (!seen.has(sid)) {
      seen.add(sid)
      ordered.push(sid)
    }
  }
  // Active session always first if not already in the list
  if (sessionState.activeSessionId && !seen.has(sessionState.activeSessionId)) {
    ordered.unshift(sessionState.activeSessionId)
  }
  return ordered
    .map((id) => sessionState.sessions.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s)
})

const recentSections = computed(() => {
  const topSession = sessionsByRecency.value[0] ?? null
  // taskItems is already ordered by most recent (addTask uses unshift)
  const topTask = taskItems[0] ?? null

  return [
    {
      icon: Server,
      sessionId: topSession?.id,
      status: topSession?.status ?? 'Not connected',
      title: 'Recent connection',
      tone: `is-${topSession?.status ?? 'idle'}`,
      value: topSession ? `${topSession.name} (${topSession.username}@${topSession.host})` : 'Create your first SSH session',
    },
    {
      icon: FolderTree,
      status: sftpState.path && sftpState.path !== '/' ? 'Browsing' : 'Ready',
      title: 'Recent path',
      tone: sftpState.path && sftpState.path !== '/' ? 'is-connected' : 'is-idle',
      value: sftpState.path && sftpState.path !== '/' ? sftpState.path : 'Open SFTP to browse remote files',
    },
    {
      icon: ListTodo,
      status: topTask?.status ?? 'No tasks',
      title: 'Recent task',
      tone: `is-${topTask?.status ?? 'idle'}`,
      value: topTask?.title ?? 'Run a transfer or long task',
    },
  ]
})

function reconnectSession(sessionId: string) {
  executeCommand('session.reconnect', {sessionId})
}
</script>
