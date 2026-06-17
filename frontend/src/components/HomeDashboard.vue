<template>
  <section class="empty-state-card home-dashboard">
    <div class="home-hero">
      <div class="empty-orb">
        <span>VR</span>
        <small>SSH</small>
      </div>
      <div>
        <span class="empty-kicker">VRShell 工作台</span>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
    </div>

    <div class="home-stats">
      <div class="home-stat-card">
        <strong>{{ stats.hosts }}</strong>
        <span>会话</span>
      </div>
      <div class="home-stat-card">
        <strong>{{ stats.groups }}</strong>
        <span>分组</span>
      </div>
      <div class="home-stat-card">
        <strong>{{ openedCount }}</strong>
        <span>已打开</span>
      </div>
      <div class="home-stat-card">
        <strong>{{ currentThemeName }}</strong>
        <span>主题</span>
      </div>
    </div>

    <div class="home-command-card">
      <div>
        <span>命令面板</span>
        <strong>快速开始你的远程工作流</strong>
      </div>
      <kbd>Ctrl</kbd><kbd>K</kbd>
    </div>

    <div class="empty-actions">
      <button class="empty-primary" @click="emit('create-session')"><span>＋</span>新建连接</button>
      <button @click="emit('import-config')"><span>⇪</span>导入配置</button>
      <button @click="emit('open-local-terminal')"><span>⌁</span>打开本地终端</button>
      <button @click="emit('create-group')"><span>▿</span>新建分组</button>
    </div>

    <div class="recent-connections">
      <span>{{ recentConnections.length > 0 ? '最近连接' : '快速引导' }}</span>
      <template v-if="recentConnections.length > 0">
        <button v-for="connection in recentConnections" :key="connection.name" @click="emit('connect-session', connection.name)">
          <strong>{{ connection.name }}</strong>
          <small>{{ connection.meta }}</small>
        </button>
      </template>
      <div v-else class="home-guide">
        <strong>还没有可用会话</strong>
        <small>点击“新建连接”创建第一个 SSH 会话，或从左侧会话树管理分组。</small>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
type HomeStats = {
  hosts: number
  groups: number
}

type RecentConnection = {
  name: string
  meta: string
}

defineProps<{
  title: string
  description: string
  stats: HomeStats
  openedCount: number
  currentThemeName: string
  recentConnections: RecentConnection[]
}>()

const emit = defineEmits<{
  (event: 'create-session'): void
  (event: 'import-config'): void
  (event: 'open-local-terminal'): void
  (event: 'create-group'): void
  (event: 'connect-session', sessionName: string): void
}>()
</script>

<style scoped>

.empty-state-card {
  position: relative;
  display: grid;
  place-items: center;
  align-content: center;
  justify-self: stretch;
  align-self: stretch;
  gap: 16px;
  min-height: 0;
  padding: 36px;
  border: 1px solid color-mix(in srgb, var(--accent) 16%, var(--idea-border));
  overflow: hidden;
  background:
    radial-gradient(circle at 24% 18%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 32%),
    linear-gradient(135deg, color-mix(in srgb, var(--ui-surface-2) 84%, transparent), var(--ui-surface-1));
  text-align: center;
}

.empty-state-card::before {
  position: absolute;
  inset: 24px;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 24px;
  pointer-events: none;
  content: '';
}

.home-dashboard {
  place-items: center;
  align-content: center;
  width: 100%;
  max-width: none;
  height: 100%;
  margin: 0;
}

.home-hero {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: center;
  text-align: left;
}

.home-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  width: min(100%, 640px);
  margin: 6px 0;
}

.home-stat-card {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 14px 12px;
  border: 1px solid color-mix(in srgb, var(--accent) 10%, var(--idea-border));
  border-radius: 12px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--ui-surface-2) 90%, transparent) 0%, color-mix(in srgb, var(--ui-surface-3) 70%, transparent) 100%);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), inset 0 1px rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.home-stat-card:hover {
  border-color: color-mix(in srgb, var(--accent) 24%, var(--idea-border));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18), inset 0 1px rgba(255, 255, 255, 0.05);
  transform: translateY(-2px);
}

.home-command-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: min(100%, 540px);
  padding: 13px 14px 13px 16px;
  border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--idea-border));
  border-left: 3px solid var(--accent);
  border-radius: 12px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--ui-surface-2) 90%, transparent) 0%, color-mix(in srgb, var(--ui-surface-3) 70%, transparent) 100%);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.home-command-card:hover {
  border-color: color-mix(in srgb, var(--accent) 32%, var(--idea-border));
  box-shadow: 0 8px 28px color-mix(in srgb, var(--accent) 10%, transparent), inset 0 1px rgba(255, 255, 255, 0.05);
  transform: translateY(-1px);
}

.home-command-card div {
  display: grid;
  gap: 4px;
}

.home-command-card span {
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-command-card strong {
  color: #e5edf8;
  font-size: 14px;
}

.home-command-card kbd {
  min-width: 28px;
  padding: 5px 8px;
  border: 1px solid var(--idea-border);
  border-radius: var(--radius-sm);
  background: rgba(2, 6, 23, 0.38);
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 800;
}

.home-stat-card strong {
  overflow: hidden;
  color: #f8fafc;
  font-size: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-stat-card span,
.home-guide small {
  color: #8b9bb0;
  font-size: 12px;
}

.home-guide {
  display: grid;
  gap: 4px;
  padding: 12px;
  color: #dbeafe;
}

.empty-orb {
  position: relative;
  display: grid;
  width: 84px;
  height: 84px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--accent) 42%, transparent);
  border-radius: 24px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent) 72%, #1e1b4b), var(--accent-strong));
  box-shadow: 0 20px 48px color-mix(in srgb, var(--accent) 20%, transparent);
  color: #f8fafc;
  font-size: 22px;
  font-weight: 900;
  animation: home-orb-float 4s ease-in-out infinite;
}

@keyframes home-orb-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.empty-orb small {
  position: absolute;
  right: -7px;
  bottom: 8px;
  padding: 2px 5px;
  border: 1px solid color-mix(in srgb, var(--accent) 38%, transparent);
  border-radius: 999px;
  background: var(--ui-surface-2);
  color: var(--idea-text-muted);
  font-size: 9px;
  letter-spacing: 0.08em;
}

.empty-kicker {
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.empty-state-card h1 {
  margin: 0;
  color: #f8fafc;
  font-size: 30px;
}

.empty-state-card p {
  max-width: 520px;
  margin: 0;
  color: #94a3b8;
  line-height: 1.7;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 6px;
}

.empty-actions button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 16px;
  border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--idea-border));
  border-radius: var(--radius-md);
  background: linear-gradient(180deg, color-mix(in srgb, var(--ui-surface-3) 86%, transparent), color-mix(in srgb, var(--ui-surface-2) 60%, transparent));
  color: var(--idea-text);
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: border-color var(--motion-base), background var(--motion-base), transform var(--motion-base), box-shadow var(--motion-base);
}

.empty-actions button span {
  display: inline-grid;
  width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: color-mix(in srgb, var(--accent) 86%, #ffffff);
}

.empty-actions .empty-primary {
  border-color: color-mix(in srgb, var(--accent) 42%, transparent);
  background: linear-gradient(135deg, var(--accent-strong), #4f46e5);
  color: #fff;
}

.empty-actions button:hover,
.recent-connections button:hover {
  border-color: color-mix(in srgb, var(--accent) 34%, transparent);
  box-shadow: 0 10px 28px color-mix(in srgb, var(--accent) 12%, transparent);
  transform: translateY(-1px);
}

.recent-connections {
  display: grid;
  width: min(100%, 540px);
  gap: 8px;
  margin-top: 12px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--accent) 10%, var(--idea-border));
  border-radius: 12px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--ui-surface-2) 86%, transparent), color-mix(in srgb, var(--ui-surface-3) 70%, transparent));
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.recent-connections > span {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-align: left;
  text-transform: uppercase;
}

.recent-connections button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 10px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--surface-soft) 68%, transparent);
  color: #dbeafe;
  text-align: left;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.recent-connections button:hover {
  background: rgba(30, 41, 59, 0.68);
}

.recent-connections small {
  color: #7f8ea3;
}
</style>
