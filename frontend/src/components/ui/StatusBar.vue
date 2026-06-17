<template>
  <footer class="statusbar">
    <div class="status-section status-left">
      <span class="section-label">Connection</span>
      <span class="status-chip connection-chip">
        <span class="online-dot" :class="{ idle: !hasActiveSession, transfer: sftpTask.status !== 'idle' }"></span>
        {{ hasActiveSession ? 'Connected' : 'Home' }}
      </span>
      <span v-if="hasActiveSession" class="status-chip">SSH-2.0</span>
      <span v-if="hasActiveSession" class="status-chip address-chip">{{ activeSessionAddress }}</span>
    </div>

    <div class="status-section status-center">
      <span class="section-label">Activity</span>
      <span v-if="sftpTask.status !== 'idle'" class="status-chip transfer-chip">SFTP {{
          sftpTask.type
        }}: {{
          sftpTask.currentFile || sftpTask.status
        }} {{ sftpTask.type === 'delete' ? sftpTask.deleted : `${sftpTask.progress}%` }}</span>
      <span v-else-if="sftpStatus" class="status-chip">SFTP: {{ sftpStatus }}</span>
      <span v-if="terminalStatusText" class="status-chip">Terminal: {{ terminalStatusText }}</span>
    </div>

    <div class="status-section status-right">
      <span class="section-label">Workspace</span>
      <span v-if="editorStatusText" class="status-chip">{{ editorStatusText }}</span>
      <span class="status-chip">UTF-8</span>
      <span class="status-chip theme-chip">{{ currentThemeName }}</span>
    </div>
  </footer>
</template>

<script setup lang="ts">
import type {SftpTask} from '../../types'

defineProps<{
  hasActiveSession: boolean
  activeSessionAddress: string
  sftpStatus: string
  sftpTask: SftpTask
  terminalStatusText: string
  editorStatusText: string
  currentThemeName: string
}>()
</script>

<style scoped>
.statusbar {
  grid-column: 1 / -1;
  grid-row: 3;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, auto) minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 30px;
  overflow: hidden;
  padding: 0 10px;
  border-top: 1px solid var(--idea-border);
  background: linear-gradient(180deg, var(--idea-chrome), color-mix(in srgb, var(--idea-chrome) 88%, #020617));
  color: var(--idea-text-muted);
  font-size: 12px;
}

.status-section {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  min-height: 22px;
  padding: 2px 6px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 7px;
  background: color-mix(in srgb, var(--idea-bg) 34%, transparent);
}

.status-center {
  justify-content: center;
}

.status-right {
  justify-content: flex-end;
}

.online-dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--status-online);
  box-shadow: 0 0 16px color-mix(in srgb, var(--status-online) 65%, transparent);
}

.online-dot.idle {
  background: var(--status-idle);
  box-shadow: none;
}

.online-dot.transfer {
  background: var(--status-transfer);
  box-shadow: 0 0 16px color-mix(in srgb, var(--status-transfer) 65%, transparent);
}

.section-label,
.status-chip {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-label {
  flex: 0 0 auto;
  color: color-mix(in srgb, var(--idea-text-muted) 58%, transparent);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 260px;
  padding: 2px 7px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 999px;
  background: color-mix(in srgb, var(--idea-panel) 70%, transparent);
  color: var(--idea-text-muted);
}

.connection-chip {
  color: var(--idea-text);
}

.address-chip {
  max-width: 220px;
}

.transfer-chip {
  border-color: color-mix(in srgb, var(--status-transfer) 28%, transparent);
  background: var(--status-transfer-soft);
  color: #bae6fd;
}

.theme-chip {
  border-color: color-mix(in srgb, var(--accent) 24%, transparent);
  color: color-mix(in srgb, var(--accent) 80%, #ffffff);
}
</style>
