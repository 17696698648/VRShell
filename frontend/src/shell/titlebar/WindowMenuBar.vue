<template>
  <nav class="window-menu" aria-label="Window menu">
    <div v-for="menu in menus" :key="menu.id" class="window-menu__group">
      <button type="button" :class="{active: openMenuId === menu.id}" @click="toggleMenu(menu.id)">{{ menu.label }}</button>
      <div v-if="openMenuId === menu.id" class="window-menu__items">
        <button
          v-for="item in menu.items"
          :key="item.command.id"
          :class="{danger: item.command.dangerous}"
          :disabled="!item.availability.enabled"
          :title="item.availability.disabledReason ?? item.command.description"
          type="button"
          @click="runMenuCommand(item.command.id)"
        >
          <span>{{ item.command.title }}</span>
          <kbd v-if="item.command.shortcut">{{ item.command.shortcut }}</kbd>
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {executeCommand, getCommand, getCommandAvailability} from '../../features/workspace/command-registry'
import {windowMenus} from './model/windowMenus'

const openMenuId = ref('')
const menus = computed(() =>
  windowMenus.map((menu) => ({
    ...menu,
    items: menu.items.flatMap((item) => {
      const command = getCommand(item.commandId)
      if (!command || command.visibleInMenu === false) return []
      const availability = getCommandAvailability(command)
      if (!availability.visible) return []
      return [{availability, command}]
    }),
  })),
)

function toggleMenu(menuId: string) {
  openMenuId.value = openMenuId.value === menuId ? '' : menuId
}

async function runMenuCommand(commandId: string) {
  await executeCommand(commandId)
  openMenuId.value = ''
}
</script>
