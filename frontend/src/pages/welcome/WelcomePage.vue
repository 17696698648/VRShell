<template>
  <section class="welcome-page" aria-labelledby="welcome-title">
    <div class="welcome-page__hero">
      <span class="welcome-page__mark" aria-hidden="true"><TerminalSquare :size="30" /></span>
      <p class="welcome-page__eyebrow">Remote workspace</p>
      <h1 id="welcome-title">Welcome to VRShell</h1>
      <p class="welcome-page__lead">Connect to SSH hosts, manage remote files, and keep terminals organized in one shell.</p>
      <div class="welcome-page__actions">
        <UiButton variant="primary" @click="executeCommand('session.createQuick')"><Server :size="15" /> New SSH Session</UiButton>
        <UiButton variant="secondary" @click="executeCommand('session.importSshConfig')"><Upload :size="15" /> Import SSH Config</UiButton>
      </div>
    </div>
    <section v-if="!onboardingDismissed" class="welcome-page__onboarding" aria-labelledby="welcome-onboarding-title">
      <div class="welcome-page__onboarding-heading">
        <div>
          <p class="welcome-page__eyebrow">First connection</p>
          <h2 id="welcome-onboarding-title">Connect safely in four steps</h2>
        </div>
        <UiButton size="sm" variant="ghost" @click="dismissOnboarding">Dismiss</UiButton>
      </div>
      <ol class="welcome-page__steps">
        <li><strong>Create a session</strong><span>Enter host, port, username, and an easy-to-scan name.</span></li>
        <li><strong>Choose authentication</strong><span>Use your SSH agent, OS-keyring password storage, or a private key path.</span></li>
        <li><strong>Verify host keys</strong><span>Accept only fingerprints you recognize; stop if a known host key changes unexpectedly.</span></li>
        <li><strong>Open SFTP</strong><span>After the terminal connects, use the SFTP panel to browse and transfer files.</span></li>
      </ol>
      <a class="welcome-page__workflow-link" href="docs/user-workflows.md">Read the user workflows guide</a>
    </section>
    <div class="welcome-page__recent" aria-label="Recent sessions">
      <h2 class="welcome-page__recent-title">Recent Sessions</h2>
      <ul v-if="recentSessions.length" class="welcome-page__recent-list">
        <li v-for="item in recentSessions" :key="item.id" class="welcome-page__recent-item">
          <button type="button" class="welcome-page__recent-btn" @click="reconnectSession(item.sessionId)">
            <span class="welcome-page__recent-icon" :class="item.tone" aria-hidden="true">
              <Server :size="14" />
            </span>
            <span class="welcome-page__recent-info">
              <strong>{{ item.label }}</strong>
              <small>{{ item.detail }}</small>
            </span>
            <span class="welcome-page__recent-status" :class="item.tone">{{ item.status }}</span>
          </button>
        </li>
      </ul>
      <p v-else class="welcome-page__recent-empty">No recent sessions. Create one to get started.</p>
    </div>
    <p class="welcome-page__hint">Tip: press <UiKbd label="Ctrl+P" /> to search commands and sessions.</p>
  </section>
</template>

<script setup lang="ts">
import {Server, TerminalSquare, Upload} from '@lucide/vue'
import {computed, ref} from 'vue'
import {sessionState} from '../../entities/session'
import {terminalState} from '../../entities/terminal'
import {executeCommand} from '../../shared/command'
import {UiButton, UiKbd} from '../../shared/ui'

type RecentSession = {
  id: string
  label: string
  detail: string
  status: string
  tone: string
  sessionId: string
}

const onboardingStorageKey = 'vrshell.onboarding.dismissed'
const onboardingDismissed = ref(readOnboardingDismissed())

/** Sessions sorted by most recently used (based on terminal tab order, last active first) */
const sessionsByRecency = computed(() => {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (let i = terminalState.tabs.length - 1; i >= 0; i--) {
    const sid = terminalState.tabs[i].sessionId
    if (!seen.has(sid)) {
      seen.add(sid)
      ordered.push(sid)
    }
  }
  if (sessionState.activeSessionId && !seen.has(sessionState.activeSessionId)) {
    ordered.unshift(sessionState.activeSessionId)
  }
  return ordered
    .map((id) => sessionState.sessions.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s)
})

const recentSessions = computed<RecentSession[]>(() =>
  sessionsByRecency.value.map((session) => ({
    id: session.id,
    label: session.name,
    detail: `${session.username}@${session.host}`,
    status: session.status,
    tone: `is-${session.status}`,
    sessionId: session.id,
  })),
)

function reconnectSession(sessionId: string) {
  executeCommand('session.reconnect', {sessionId})
}

function dismissOnboarding() {
  onboardingDismissed.value = true
  if (typeof localStorage !== 'undefined') localStorage.setItem(onboardingStorageKey, 'true')
}

function readOnboardingDismissed() {
  return typeof localStorage !== 'undefined' && localStorage.getItem(onboardingStorageKey) === 'true'
}
</script>
