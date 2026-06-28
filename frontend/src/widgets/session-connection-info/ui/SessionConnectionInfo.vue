<template>
  <section class="session-connection-info" aria-label="Connection inspector">
    <template v-if="activeSession">
      <header class="session-connection-info__hero">
        <div :class="['session-connection-info__status', activeSession.status]" />
        <div>
          <strong>{{ activeSession.name }}</strong>
          <small>{{ activeSession.username }}@{{ activeSession.host }}:{{ activeSession.port }}</small>
        </div>
      </header>
      <section class="session-connection-info__card">
        <h3>Connection</h3>
        <dl class="session-connection-info__details">
          <dt>Host</dt>
          <dd>{{ activeSession.host }}:{{ activeSession.port }}</dd>
          <dt>User</dt>
          <dd>{{ activeSession.username }}</dd>
          <dt>Protocol</dt>
          <dd>{{ activeSession.protocol.toUpperCase() }}</dd>
          <dt>Status</dt>
          <dd :class="`status--${activeSession.status}`">{{ activeSession.status }}</dd>
        </dl>
      </section>
      <section v-if="activeTab" class="session-connection-info__card">
        <h3>Runtime</h3>
        <dl class="session-connection-info__details">
          <dt v-if="activeTab.latency != null">Latency</dt>
          <dd v-if="activeTab.latency != null">{{ activeTab.latency }}ms</dd>
          <dt v-if="activeTab.cwd">CWD</dt>
          <dd v-if="activeTab.cwd" class="session-connection-info__cwd">{{ activeTab.cwd }}</dd>
        </dl>
      </section>
    </template>
    <template v-else-if="connectedTabs.length > 0">
      <header class="session-connection-info__hero">
        <div class="session-connection-info__status connected" />
        <div>
          <strong>{{ connectedTabs.length }} connections</strong>
          <small>Pick a session to inspect details</small>
        </div>
      </header>
      <section class="session-connection-info__card">
        <h3>Active connections</h3>
        <ul class="session-connection-info__list">
          <li v-for="tab in connectedTabs" :key="tab.id" class="session-connection-info__list-item">
            <div :class="['session-connection-info__status-dot', tab.status]" />
            <span class="session-connection-info__list-title">{{ tab.title }}</span>
            <span v-if="tab.latency != null" class="session-connection-info__list-latency">{{ tab.latency }}ms</span>
          </li>
        </ul>
      </section>
    </template>
    <div v-else class="session-connection-info__empty">
      <span class="session-connection-info__empty-icon">⊘</span>
      <strong>No active connections</strong>
      <span>Connect to a session to inspect host, user, latency, and runtime context.</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {sessionState, getActiveSession} from '../../../entities/session'
import {terminalState} from '../../../entities/terminal'

const activeSession = computed(() => getActiveSession())
const connectedTabs = computed(() => terminalState.tabs.filter((tab) => tab.status === 'connected' || tab.status === 'connecting'))
const activeTab = computed(() => terminalState.tabs.find((tab) => tab.sessionId === sessionState.activeSessionId) ?? null)
</script>

<style scoped>
.session-connection-info {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  height: 100%;
  padding: var(--space-3);
  overflow: auto;
  font-size: var(--font-size-sm);
}

.session-connection-info__hero,
.session-connection-info__card {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-bg-tool-window-raised) 58%, transparent);
}

.session-connection-info__hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-3);
}

.session-connection-info__hero > div:last-child,
.session-connection-info__card {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.session-connection-info__hero strong,
.session-connection-info__hero small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-connection-info__hero small {
  color: var(--color-text-muted);
}

.session-connection-info__status {
  width: 9px;
  height: 28px;
  border-radius: 999px;
  background: var(--color-state-idle);
  flex-shrink: 0;
}

.session-connection-info__status.connected { background: var(--color-success); box-shadow: 0 0 14px color-mix(in srgb, var(--color-success) 28%, transparent); }
.session-connection-info__status.connecting { background: var(--color-warning); animation: pulse 1.2s ease-in-out infinite; }
.session-connection-info__status.failed { background: var(--color-danger); }
.session-connection-info__status.idle { background: var(--color-state-idle); }

.session-connection-info__card {
  padding: var(--space-3);
}

.session-connection-info__card h3 {
  margin: 0 0 var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.session-connection-info__details {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 6px 12px;
  margin: 0;
}

.session-connection-info__details dt {
  color: var(--color-text-muted);
  font-weight: 600;
}

.session-connection-info__details dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--color-text-primary);
}

.session-connection-info__details .status--connected { color: var(--color-success); }
.session-connection-info__details .status--connecting { color: var(--color-warning); }
.session-connection-info__details .status--failed { color: var(--color-danger); }
.session-connection-info__details .status--idle { color: var(--color-text-muted); }

.session-connection-info__cwd {
  font-family: var(--font-mono, monospace);
  font-size: var(--font-size-xs);
}

.session-connection-info__list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.session-connection-info__list-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 6px;
  align-items: center;
  min-height: 28px;
  padding: 4px 6px;
  border-radius: var(--radius-control);
}

.session-connection-info__list-item:hover {
  background: var(--color-bg-hover);
}

.session-connection-info__status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.session-connection-info__status-dot.connected { background: var(--color-success); }
.session-connection-info__status-dot.connecting { background: var(--color-warning); }

.session-connection-info__list-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
}

.session-connection-info__list-latency {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  flex-shrink: 0;
}

.session-connection-info__empty {
  display: grid;
  place-items: center;
  align-content: center;
  gap: var(--space-2);
  min-height: 220px;
  padding: var(--space-4);
  color: var(--color-text-muted);
  text-align: center;
}

.session-connection-info__empty strong {
  color: var(--color-text-primary);
}

.session-connection-info__empty-icon {
  font-size: 24px;
  opacity: 0.5;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
