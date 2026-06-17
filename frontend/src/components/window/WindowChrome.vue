<template>
  <header class="window-titlebar" data-tauri-drag-region>
    <div class="titlebar-left" data-tauri-drag-region>
      <div class="titlebar-icon" data-tauri-drag-region>VR</div>
    </div>
    <div class="titlebar-center" data-tauri-drag-region>
      <WindowMenuBar
        :menus="menus"
        :active-menu="activeMenu"
        :active-menu-items="activeMenuItems"
        :menu-open="menuOpen"
        @toggle-menu="emit('toggle-menu')"
        @update:active-menu="emit('update:activeMenu', $event)"
        @run-menu-action="emit('run-menu-action', $event)"
      />
      <TitlebarSessionInfo
        v-if="hasActiveSession"
        :name="activeSessionName"
        :address="activeSessionAddress"
        :auto-reconnect="autoReconnect"
        :idle-timeout-secs="idleTimeoutSecs"
      />
    </div>
    <WindowControls
      :is-window-maximized="isWindowMaximized"
      @minimize="emit('minimize')"
      @toggle-maximize="emit('toggle-maximize')"
      @close="emit('close')"
    />
  </header>
</template>

<script setup lang="ts">
import type {WindowMenuId} from '../../menuTypes'
import type {WindowMenu, WindowMenuAction, WindowMenuItem} from '../../windowMenus'
import TitlebarSessionInfo from './TitlebarSessionInfo.vue'
import WindowControls from './WindowControls.vue'
import WindowMenuBar from './WindowMenuBar.vue'

defineProps<{
  menus: WindowMenu[]
  activeMenu: WindowMenuId
  activeMenuItems: WindowMenuItem[]
  menuOpen: boolean
  hasActiveSession: boolean
  activeSessionName: string
  activeSessionAddress: string
  isWindowMaximized: boolean
  autoReconnect?: boolean
  idleTimeoutSecs?: number
}>()

const emit = defineEmits<{
  (event: 'toggle-menu'): void
  (event: 'update:activeMenu', value: WindowMenuId): void
  (event: 'run-menu-action', action: WindowMenuAction): void
  (event: 'minimize'): void
  (event: 'toggle-maximize'): void
  (event: 'close'): void
}>()
</script>

<style scoped>
.window-titlebar {
  grid-column: 1 / -1;
  grid-row: 1;
  position: relative;
  z-index: var(--z-titlebar);
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  min-width: 0;
  height: 38px;
  border-bottom: 1px solid var(--idea-border);
  background: var(--idea-chrome);
  user-select: none;
}

.window-titlebar :deep(button) {
  line-height: 1;
  cursor: pointer;
}

.titlebar-left {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 100%;
}

.titlebar-icon {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 1px solid rgba(34, 211, 238, 0.7);
  border-radius: 6px;
  background: linear-gradient(135deg, #020617, #1e1b4b);
  color: #f8fafc;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: -0.06em;
}

.titlebar-center {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
  min-width: 0;
  color: #e2e8f0;
  font-size: 12px;
}
</style>
