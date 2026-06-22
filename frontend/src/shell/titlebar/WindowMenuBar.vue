<template>
  <nav class="window-menu" aria-label="Window menu">
    <div v-for="menu in menus" :key="menu.id" class="window-menu__group">
      <button type="button" :class="{active: openMenuId === menu.id}" @click="toggleMenu(menu.id)">{{ menu.label }}</button>
      <div v-if="openMenuId === menu.id" class="window-menu__items">
        <UiCommandMenu :command-ids="menu.items.map((item) => item.commandId)" @executed="openMenuId = ''" />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {UiCommandMenu} from '../../shared/ui'
import {windowMenus} from './model/windowMenus'

const openMenuId = ref('')
const menus = windowMenus

function toggleMenu(menuId: string) {
  openMenuId.value = openMenuId.value === menuId ? '' : menuId
}

</script>
