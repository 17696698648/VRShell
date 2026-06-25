<template>
  <Transition name="overlay-fade">
    <div v-if="workspaceState.commandPaletteOpen" class="overlay" @click.self="closeCommandPalette">
    <section class="command-palette" role="dialog" aria-label="Command palette" data-testid="command-palette">
      <label class="command-palette__input">
        <span aria-hidden="true">&gt;</span>
        <input
          ref="inputRef"
          v-model="query"
          data-testid="command-palette-search"
          autofocus
          placeholder="Type a command, panel, shortcut, or action"
          @keydown.enter.prevent="runSelectedCommand"
          @keydown.escape="closeCommandPalette"
          @keydown.up.prevent="navigateUp"
          @keydown.down.prevent="navigateDown"
        />
      </label>
      <div v-if="commandGroups.length > 0" ref="listRef" class="command-palette__list" role="listbox">
        <section v-for="group in commandGroups" :key="group.category" class="command-palette__group">
          <h3 class="command-palette__group-header" @click="toggleGroup(group.category)">
            <span class="command-palette__group-chevron" :class="{collapsed: collapsedGroups.has(group.category)}" aria-hidden="true">&#x25BE;</span>
            {{ group.category }}
            <small>{{ group.entries.length }}</small>
          </h3>
          <template v-if="!collapsedGroups.has(group.category)">
          <button
            v-for="entry in group.entries"
            :key="entry.command.id"
            :ref="(el) => setButtonRef(entry.command.id, el as HTMLElement)"
            :data-command-id="commandTestId(entry.command.id)"
            :class="{disabled: !entry.availability.enabled, danger: entry.command.dangerous, selected: isSelected(entry.command.id)}"
            :disabled="!entry.availability.enabled"
            :title="entry.availability.disabledReason ?? entry.command.description"
            type="button"
            role="option"
            :aria-selected="isSelected(entry.command.id)"
            @click="runCommand(entry.command.id)"
            @mouseenter="selectedIndex = flatIndex(entry.command.id)"
          >
            <span class="command-palette__icon" aria-hidden="true">{{ entry.command.icon ?? categoryIcon(entry.command.category ?? entry.command.group) }}</span>
            <span>
              <strong>{{ entry.command.title }}</strong>
              <small>{{ entry.availability.disabledReason ?? entry.command.description ?? entry.command.id }}</small>
            </span>
            <small class="command-palette__category">{{ entry.command.category ?? entry.command.group }}</small>
            <small class="command-palette__scope">{{ entry.command.scope ?? entry.command.group }}</small>
            <small v-if="recentCommandIds.includes(entry.command.id)" class="command-palette__recent">Recent</small>
            <UiKbd v-if="entry.command.shortcut" :label="entry.command.shortcut" />
          </button>
          </template>
        </section>
      </div>
      <EmptyState v-else compact icon="?" title="No commands found" description="Try searching for session, terminal, sftp, settings, or workspace." />
    </section>
  </div>
  </Transition>
</template>

<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue'
import {workspaceState} from '../../entities/workspace'
import {closeCommandPalette} from '../../features/workspace/open-command-palette/commandPalette'
import {executeCommand, getCommandAvailability, getRecentCommandIds, searchCommands} from '../../shared/command'
import {requestConfirm} from '../../shared/dialog'
import {EmptyState, UiKbd} from '../../shared/ui'

const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const selectedIndex = ref(0)
const buttonRefs = new Map<string, HTMLElement>()
const collapsedGroups = ref(new Set<string>())

const recentCommandIds = computed(() => getRecentCommandIds())
const filteredCommands = computed(() => searchCommands(query.value).map((command) => ({command, availability: getCommandAvailability(command)})))
const flatList = computed(() => {
  const collapsed = collapsedGroups.value
  return filteredCommands.value.filter((entry) => {
    if (!entry.availability.enabled) return false
    const category = entry.command.category ?? entry.command.group
    return !collapsed.has(category)
  })
})
const commandGroups = computed(() => {
  const groups = new Map<string, typeof filteredCommands.value>()
  for (const entry of filteredCommands.value) {
    const category = entry.command.category ?? entry.command.group
    groups.set(category, [...(groups.get(category) ?? []), entry])
  }
  return Array.from(groups.entries()).map(([category, entries]) => ({category, entries}))
})

watch(query, () => {
  selectedIndex.value = 0
})

function setButtonRef(id: string, el: HTMLElement | null) {
  if (el) buttonRefs.set(id, el)
  else buttonRefs.delete(id)
}

function isSelected(commandId: string) {
  const idx = flatList.value.findIndex((e) => e.command.id === commandId)
  return idx === selectedIndex.value
}

function flatIndex(commandId: string) {
  return flatList.value.findIndex((e) => e.command.id === commandId)
}

function navigateUp() {
  if (flatList.value.length === 0) return
  selectedIndex.value = (selectedIndex.value - 1 + flatList.value.length) % flatList.value.length
  scrollSelectedIntoView()
}

function navigateDown() {
  if (flatList.value.length === 0) return
  selectedIndex.value = (selectedIndex.value + 1) % flatList.value.length
  scrollSelectedIntoView()
}

function scrollSelectedIntoView() {
  const entry = flatList.value[selectedIndex.value]
  if (!entry) return
  void nextTick(() => {
    const el = buttonRefs.get(entry.command.id)
    el?.scrollIntoView({block: 'nearest'})
  })
}

async function runCommand(commandId: string) {
  const entry = filteredCommands.value.find((item) => item.command.id === commandId)
  if (entry?.command.dangerous) {
    const confirmed = await requestConfirm({title: 'Run dangerous command?', message: entry.command.description ?? entry.command.title, confirmLabel: 'Run', tone: 'danger'})
    if (!confirmed) return
  }
  await executeCommand(commandId)
  closeCommandPalette()
  query.value = ''
}

async function runSelectedCommand() {
  const selected = flatList.value[selectedIndex.value]
  if (selected) await runCommand(selected.command.id)
}

function categoryIcon(category: string) {
  return category.slice(0, 1).toUpperCase()
}

function commandTestId(commandId: string) {
  if (commandId === 'session.createQuick') return 'cmd-new-connection'
  return commandId
}

function toggleGroup(category: string) {
  const groups = new Set(collapsedGroups.value)
  if (groups.has(category)) groups.delete(category)
  else groups.add(category)
  collapsedGroups.value = groups
  selectedIndex.value = 0
}
</script>
