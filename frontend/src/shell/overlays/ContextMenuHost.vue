<template>
  <div v-if="contextMenuState.menu" class="context-menu-layer" @click="closeContextMenu" @contextmenu.prevent="closeContextMenu">
    <div class="context-menu" :style="menuStyle" role="menu" @click.stop>
      <button
        v-for="item in contextMenuState.menu.items"
        :key="item.id"
        type="button"
        role="menuitem"
        :disabled="item.disabled"
        :class="{'context-menu__danger': item.danger}"
        @click="executeContextMenuItem(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {closeContextMenu, contextMenuState, executeContextMenuItem} from '../../shared/context-menu'

const menuStyle = computed(() => ({
  left: `${contextMenuState.menu?.x ?? 0}px`,
  top: `${contextMenuState.menu?.y ?? 0}px`,
}))
</script>
