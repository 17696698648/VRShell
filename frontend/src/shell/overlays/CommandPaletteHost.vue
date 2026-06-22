<template>
  <div v-if="workspaceState.commandPaletteOpen" class="overlay" @click.self="closeCommandPalette">
    <section class="command-palette" role="dialog" aria-label="Command palette" data-testid="command-palette">
      <label class="command-palette__input">
        <span aria-hidden="true">&gt;</span>
        <input v-model="query" data-testid="command-palette-search" autofocus placeholder="Type a command, panel, shortcut, or action" @keydown.enter.prevent="runFirstCommand" @keydown.escape="closeCommandPalette" />
      </label>
      <div v-if="commandGroups.length > 0" class="command-palette__list" role="listbox">
        <section v-for="group in commandGroups" :key="group.category" class="command-palette__group">
          <h3>{{ group.category }}</h3>
          <button v-for="entry in group.entries" :key="entry.command.id" :data-command-id="commandTestId(entry.command.id)" :class="{disabled: !entry.availability.enabled, danger: entry.command.dangerous}" :disabled="!entry.availability.enabled" :title="entry.availability.disabledReason ?? entry.command.description" type="button" role="option" @click="runCommand(entry.command.id)">
            <span class="command-palette__icon" aria-hidden="true">{{ entry.command.icon ?? categoryIcon(entry.command.category ?? entry.command.group) }}</span>
            <span>
              <strong>{{ entry.command.title }}</strong>
              <small>{{ entry.availability.disabledReason ?? entry.command.description ?? entry.command.id }}</small>
            </span>
            <small class="command-palette__category">{{ entry.command.category ?? entry.command.group }}</small>
            <small class="command-palette__scope">{{ entry.command.scope ?? entry.command.group }}</small>
            <small v-if="recentCommandIds.includes(entry.command.id)" class="command-palette__recent">Recent</small>
            <kbd v-if="entry.command.shortcut">{{ entry.command.shortcut }}</kbd>
          </button>
        </section>
      </div>
      <EmptyState v-else compact icon="⌕" title="No commands found" description="Try searching for session, terminal, sftp, settings, or workspace." />
    </section>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {workspaceState} from '../../entities/workspace'
import {closeCommandPalette} from '../../features/workspace/open-command-palette/commandPalette'
import {executeCommand, getCommandAvailability, getRecentCommandIds, searchCommands} from '../../features/workspace/command-registry'
import {requestConfirm} from '../../shared/dialog'
import {EmptyState} from '../../shared/ui'

const query = ref('')
const recentCommandIds = computed(() => getRecentCommandIds())
const filteredCommands = computed(() => searchCommands(query.value).map((command) => ({command, availability: getCommandAvailability(command)})))
const commandGroups = computed(() => {
  const groups = new Map<string, typeof filteredCommands.value>()
  for (const entry of filteredCommands.value) {
    const category = entry.command.category ?? entry.command.group
    groups.set(category, [...(groups.get(category) ?? []), entry])
  }
  return Array.from(groups.entries()).map(([category, entries]) => ({category, entries}))
})

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

async function runFirstCommand() {
  const firstCommand = filteredCommands.value.find((entry) => entry.availability.enabled)
  if (firstCommand) await runCommand(firstCommand.command.id)
}

function categoryIcon(category: string) {
  return category.slice(0, 1).toUpperCase()
}

function commandTestId(commandId: string) {
  if (commandId === 'session.createQuick') return 'cmd-new-connection'
  return commandId
}
</script>
