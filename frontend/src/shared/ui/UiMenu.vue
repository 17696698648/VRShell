<template>
  <div class="ui-menu" role="menu">
    <button
      v-for="item in items"
      :key="item.id"
      :class="['ui-menu__item', {danger: item.danger}]"
      type="button"
      role="menuitem"
      :disabled="item.disabled"
      :title="item.disabledReason"
      @click="selectItem(item)"
    >
      <span v-if="item.icon" class="ui-menu__icon">{{ item.icon }}</span>
      <span>{{ item.label }}</span>
      <kbd v-if="item.shortcut">{{ item.shortcut }}</kbd>
    </button>
  </div>
</template>

<script setup lang="ts">
export interface UiMenuItem {
  danger?: boolean
  disabled?: boolean
  disabledReason?: string
  icon?: string
  id: string
  label: string
  shortcut?: string
}

const props = defineProps<{items: UiMenuItem[]}>()
const emit = defineEmits<{select: [item: UiMenuItem]}>()

function selectItem(item: UiMenuItem) {
  if (item.disabled) return
  emit('select', item)
}
</script>
