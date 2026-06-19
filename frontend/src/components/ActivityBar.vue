<template>
  <nav class="activity-bar">
    <button
      class="activity-button"
      data-testid="activity-sessions"
      :class="{ active: activeDrawer === 'sessions' }"
      title="Sessions"
      @click="emit('toggle-drawer', 'sessions')"
    >
      <svg class="activity-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="11" rx="2" />
        <path d="M9 20h6M12 16v4" />
      </svg>
    </button>
    <button
      class="activity-button"
      data-testid="activity-sftp"
      :class="{ active: activeDrawer === 'sftp' }"
      title="SFTP"
      @click="emit('toggle-drawer', 'sftp')"
    >
      <svg class="activity-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7.5h6l1.6 2H20v7.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        <path d="M4 7.5V6a2 2 0 0 1 2-2h3.2l1.6 2H18a2 2 0 0 1 2 2v1.5" />
      </svg>
    </button>
    <button class="activity-button" title="Quick Commands">
      <svg class="activity-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 7h14M5 12h9M5 17h6" />
        <path d="m17 15 2 2-2 2" />
      </svg>
    </button>

    <div class="activity-spacer"></div>
    <button class="activity-button" title="Settings">
      <svg class="activity-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" />
        <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.2 3h-4.4l-.3 2.7a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.3 2.7h4.4l.3-2.7a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" />
      </svg>
    </button>
  </nav>
</template>

<script setup lang="ts">
type DrawerName = 'sessions' | 'sftp'

defineProps<{
  activeDrawer: DrawerName | null
}>()

const emit = defineEmits<{
  (event: 'toggle-drawer', drawerName: DrawerName): void
}>()
</script>

<style scoped>
.activity-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 10px 6px;
  border-right: 1px solid var(--idea-border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent 36%),
    var(--idea-chrome);
}

.activity-button {
  position: relative;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--idea-text-muted);
  font-size: 18px;
  transition: background var(--motion-fast), color var(--motion-fast), box-shadow var(--motion-fast);
}

.activity-button:hover {
  background: var(--idea-accent-soft);
  color: var(--idea-text);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent);
}

.activity-button:hover .activity-icon {
  transform: scale(1.04);
}

.activity-button.active {
  border-color: transparent;
  background: var(--idea-accent-soft);
  color: #ffffff;
  box-shadow: none;
}

.activity-button.active::before {
  position: absolute;
  top: 7px;
  bottom: 7px;
  left: -6px;
  width: 3px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 60%, transparent);
  content: '';
}

.activity-icon {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--motion-fast);
}

.activity-spacer {
  flex: 1;
}
</style>
