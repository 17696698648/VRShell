<template>
  <div class="session-connection-info">
    <template v-if="activeSession">
      <div class="session-connection-info__header">
        <div :class="['session-connection-info__status', activeSession.status]" />
        <strong class="session-connection-info__name">{{ activeSession.name }}</strong>
      </div>
      <dl class="session-connection-info__details">
        <dt>Host</dt>
        <dd>{{ activeSession.host }}:{{ activeSession.port }}</dd>
        <dt>User</dt>
        <dd>{{ activeSession.username }}</dd>
        <dt>Protocol</dt>
        <dd>{{ activeSession.protocol.toUpperCase() }}</dd>
        <dt>Status</dt>
        <dd :class="`status--${activeSession.status}`">{{ activeSession.status }}</dd>
        <template v-if="activeTab">
          <dt v-if="activeTab.latency != null">Latency</dt>
          <dd v-if="activeTab.latency != null">{{ activeTab.latency }}ms</dd>
          <dt v-if="activeTab.cwd">CWD</dt>
          <dd v-if="activeTab.cwd" class="session-connection-info__cwd">{{ activeTab.cwd }}</dd>
        </template>
      </dl>
    </template>
    <template v-else-if="connectedTabs.length > 0">
      <div class="session-connection-info__header">
        <div class="session-connection-info__status connected" />
        <strong class="session-connection-info__name">{{ connectedTabs.length }} connections</strong>
      </div>
      <ul class="session-connection-info__list">
        <li v-for="tab in connectedTabs" :key="tab.id" class="session-connection-info__list-item">
          <div :class="['session-connection-info__status-dot', tab.status]" />
          <span class="session-connection-info__list-title">{{ tab.title }}</span>
          <span v-if="tab.latency != null" class="session-connection-info__list-latency">{{ tab.latency }}ms</span>
        </li>
      </ul>
    </template>
    <div v-else class="session-connection-info__empty">
      <span class="session-connection-info__empty-icon">⊘</span>
      <span>No active connections</span>
    </div>
  </div>
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
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  font-size: 12px;
}

.session-connection-info__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.session-connection-info__status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-muted);
  flex-shrink: 0;
}

.session-connection-info__status.connected { background: var(--color-success); }
.session-connection-info__status.connecting { background: var(--color-warning); animation: pulse 1.2s ease-in-out infinite; }
.session-connection-info__status.failed { background: var(--color-danger); }
.session-connection-info__status.idle { background: var(--color-text-muted); }

.session-connection-info__name {
  font-size: 13px;
  color: var(--color-text-primary);
}

.session-connection-info__details {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  margin: 0;
}

.session-connection-info__details dt {
  color: var(--color-text-muted);
  font-weight: 500;
}

.session-connection-info__details dd {
  margin: 0;
  color: var(--color-text-primary);
  word-break: break-all;
}

.session-connection-info__details .status--connected { color: var(--color-success); }
.session-connection-info__details .status--connecting { color: var(--color-warning); }
.session-connection-info__details .status--failed { color: var(--color-danger); }
.session-connection-info__details .status--idle { color: var(--color-text-muted); }

.session-connection-info__cwd {
  font-family: var(--font-mono, monospace);
  font-size: 11px;
}

.session-connection-info__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.session-connection-info__list-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}

.session-connection-info__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.session-connection-info__status-dot.connected { background: var(--color-success); }
.session-connection-info__status-dot.connecting { background: var(--color-warning); }

.session-connection-info__list-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
}

.session-connection-info__list-latency {
  color: var(--color-text-muted);
  font-size: 11px;
  flex-shrink: 0;
}

.session-connection-info__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
  color: var(--color-text-muted);
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
