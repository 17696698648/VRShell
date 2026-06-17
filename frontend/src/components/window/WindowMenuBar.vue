<template>
  <div class="window-menu-zone">
    <button v-if="!menuOpen" class="titlebar-menu-trigger" title="Main menu" @click.stop="emit('toggle-menu')">
      <span aria-hidden="true" class="hamburger-lines"><i></i><i></i><i></i><i></i></span>
    </button>
    <div v-else class="window-menu-tabs expanded" @click.stop>
      <button
        v-for="menu in menus"
        :key="menu.id"
        :class="{ active: activeMenu === menu.id }"
        @mouseenter="emit('update:activeMenu', menu.id)"
      >
        {{ menu.label }}
      </button>
    </div>
    <div v-if="menuOpen" class="window-menu-popover" @click.stop>
      <div class="window-menu-items">
        <button v-for="item in activeMenuItems" :key="item.label" @click="emit('run-menu-action', item.action)">
          <span>{{ item.label }}</span>
          <small v-if="item.shortcut">{{ item.shortcut }}</small>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {WindowMenuId} from '../../menuTypes'
import type {WindowMenu, WindowMenuAction, WindowMenuItem} from '../../windowMenus'

defineProps<{
  menus: WindowMenu[]
  activeMenu: WindowMenuId
  activeMenuItems: WindowMenuItem[]
  menuOpen: boolean
}>()

const emit = defineEmits<{
  (event: 'toggle-menu'): void
  (event: 'update:activeMenu', value: WindowMenuId): void
  (event: 'run-menu-action', action: WindowMenuAction): void
}>()
</script>

<style scoped>
.window-menu-zone {
  position: relative;
  display: flex;
  align-items: center;
  flex: 0 1 auto;
  min-width: 0;
  height: 100%;
}

/* ── Hamburger trigger ── */
.titlebar-menu-trigger {
  display: grid;
  width: 24px;
  height: 24px;
  margin-right: 2px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  padding: 0;
  background: transparent;
  color: #cbd5e1;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.titlebar-menu-trigger:hover {
  background: rgba(56, 189, 248, 0.16);
  color: #f8fafc;
}

.hamburger-lines {
  display: grid;
  gap: 2px;
  width: 14px;
}

.hamburger-lines i {
  display: block;
  height: 1px;
  border-radius: 1px;
  background: #94a3b8;
}

.titlebar-menu-trigger:hover .hamburger-lines i {
  background: #e2e8f0;
}

/* ── Top-level menu tabs (File | Edit | View | …) ── */
.window-menu-tabs {
  display: flex;
  align-items: center;
  max-width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 0 4px;
}

.window-menu-tabs button {
  height: 24px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  color: #dbeafe;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  text-align: left;
}

.window-menu-tabs button:hover,
.window-menu-tabs button.active {
  background: rgba(75, 110, 175, 0.22);
  color: #f8fafc;
}

/* ── Dropdown popover ── */
.window-menu-popover {
  position: absolute;
  top: 37px;
  left: 0;
  z-index: var(--z-popover);
  display: grid;
  min-width: 280px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 0 0 12px 12px;
  background: rgba(37, 38, 41, 0.96);
  box-shadow: 0 20px 54px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(16px);
}

/* ── Dropdown items ── */
.window-menu-items {
  display: grid;
  padding: 6px;
}

.window-menu-items button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #dbeafe;
  font-family: inherit;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  text-align: left;
}

.window-menu-items button:hover {
  background: rgba(75, 110, 175, 0.22);
  color: #f8fafc;
}

.window-menu-items small {
  color: #94a3b8;
  font-size: 11px;
}
</style>
