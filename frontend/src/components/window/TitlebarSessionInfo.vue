<template>
  <div class="titlebar-session-info" data-tauri-drag-region>
    <span class="titlebar-session-dot connected"></span>
    <span class="titlebar-session-name">{{ name }}</span>
    <span class="titlebar-session-sep">—</span>
    <span class="titlebar-session-address">{{ address }}</span>
    <span v-if="autoReconnect" class="titlebar-badge reconn" title="Auto-reconnect enabled">⟳</span>
    <span v-if="idleTimeoutSecs && idleTimeoutSecs > 0" class="titlebar-badge idle" :title="`Idle timeout: ${formatIdle(idleTimeoutSecs)}`">⏱{{ formatIdleShort(idleTimeoutSecs) }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  address: string
  autoReconnect?: boolean
  idleTimeoutSecs?: number
}>()

function formatIdle(secs: number): string {
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}min`
  return `${Math.floor(secs / 3600)}h`
}

function formatIdleShort(secs: number): string {
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  return `${Math.floor(secs / 3600)}h`
}
</script>

<style scoped>
.titlebar-session-info {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  margin-left: 14px;
  padding: 4px 12px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.03);
}

.titlebar-session-dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #64748b;
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

.titlebar-session-dot.connected {
  background: var(--status-online);
  box-shadow: 0 0 8px color-mix(in srgb, var(--status-online) 55%, transparent);
}

.titlebar-session-name {
  max-width: 160px;
  overflow: hidden;
  color: #f1f5f9;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.titlebar-session-sep {
  color: #475569;
  font-weight: 300;
}

.titlebar-session-address {
  max-width: 200px;
  overflow: hidden;
  color: #94a3b8;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.titlebar-badge {
  flex: 0 0 auto;
  height: 18px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  line-height: 18px;
  white-space: nowrap;
}

.titlebar-badge.reconn {
  background: rgba(56, 189, 248, 0.14);
  color: #7dd3fc;
}

.titlebar-badge.idle {
  background: rgba(251, 191, 36, 0.12);
  color: #fcd34d;
}
</style>
