<template>
  <div ref="menuRef" class="ui-command-menu" role="menu" tabindex="-1" @keydown="handleKeydown">
    <template v-for="item in resolvedItems" :key="item.id">
      <div v-if="isSeparator(item)" class="ui-command-menu__separator" role="separator" />
      <strong v-else-if="isGroup(item)" class="ui-command-menu__group">{{ item.label }}</strong>
      <button
      v-else
      :key="item.command.id"
      :class="['ui-command-menu__item', {danger: item.command.dangerous}]"
      :disabled="!item.availability.enabled"
      :title="item.availability.disabledReason ?? item.command.description"
      type="button"
      role="menuitem"
      :tabindex="item.availability.enabled ? 0 : -1"
      @click="run(item.command.id)"
    >
      <span>{{ item.command.title }}</span>
      <kbd v-if="item.command.shortcut">{{ item.command.shortcut }}</kbd>
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, ref, watch} from 'vue'
import {executeCommand, getCommand, getCommandAvailability, type AppCommand, type CommandAvailability} from '../../features/workspace/command-registry'

type CommandMenuEntry = string | {type: 'separator'; id: string} | {type: 'group'; id: string; label: string}
type ResolvedCommandMenuItem = {id: string; type: 'command'; availability: CommandAvailability; command: AppCommand} | {type: 'separator'; id: string} | {type: 'group'; id: string; label: string}

const props = defineProps<{commandIds: CommandMenuEntry[]}>()
const emit = defineEmits<{executed: [commandId: string]}>()
const menuRef = ref<HTMLElement | null>(null)
let typeahead = ''
let typeaheadTimer: number | undefined

const resolvedItems = computed<ResolvedCommandMenuItem[]>(() => {
  const items: ResolvedCommandMenuItem[] = []
  for (const entry of props.commandIds) {
    if (typeof entry !== 'string') {
      items.push(entry)
      continue
    }
    const command = getCommand(entry)
    if (!command || command.visibleInMenu === false) continue
    const availability = getCommandAvailability(command)
    if (availability.visible) items.push({id: command.id, type: 'command', availability, command})
  }
  return items
})

const enabledCommands = computed(() => resolvedItems.value.filter((item): item is Extract<ResolvedCommandMenuItem, {type: 'command'}> => item.type === 'command' && item.availability.enabled))

onMounted(() => focusFirstItem())
watch(enabledCommands, () => nextTick(focusFirstItem))

function isSeparator(item: ResolvedCommandMenuItem): item is Extract<ResolvedCommandMenuItem, {type: 'separator'}> {
  return item.type === 'separator'
}

function isGroup(item: ResolvedCommandMenuItem): item is Extract<ResolvedCommandMenuItem, {type: 'group'}> {
  return item.type === 'group'
}

async function run(commandId: string) {
  await executeCommand(commandId)
  emit('executed', commandId)
}

function handleKeydown(event: KeyboardEvent) {
  const buttons = getEnabledButtons(event.currentTarget as HTMLElement)
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('executed', '')
    return
  }
  if (event.key === 'Enter' && document.activeElement instanceof HTMLButtonElement) {
    event.preventDefault()
    document.activeElement.click()
    return
  }
  if (isPrintableKey(event)) {
    event.preventDefault()
    focusTypeahead(buttons, event.key, index)
    return
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return
  event.preventDefault()
  const currentIndex = index === -1 ? 0 : index
  const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowUp' ? Math.max(0, currentIndex - 1) : Math.min(buttons.length - 1, currentIndex + 1)
  buttons[nextIndex]?.focus()
}

function focusFirstItem() {
  getEnabledButtons(menuRef.value)[0]?.focus()
}

function getEnabledButtons(root: HTMLElement | null) {
  return Array.from(root?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
}

function isPrintableKey(event: KeyboardEvent) {
  return event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey
}

function focusTypeahead(buttons: HTMLButtonElement[], key: string, currentIndex: number) {
  window.clearTimeout(typeaheadTimer)
  typeahead += key.toLocaleLowerCase()
  typeaheadTimer = window.setTimeout(() => {
    typeahead = ''
  }, 700)
  const startIndex = Math.max(0, currentIndex + 1)
  const orderedButtons = [...buttons.slice(startIndex), ...buttons.slice(0, startIndex)]
  orderedButtons.find((button) => button.textContent?.trim().toLocaleLowerCase().startsWith(typeahead))?.focus()
}
</script>
