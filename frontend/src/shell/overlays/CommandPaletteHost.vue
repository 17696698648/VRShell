<template>
  <div v-if="workspaceState.commandPaletteOpen" class="overlay" @click.self="closeCommandPalette">
    <section class="command-palette" role="dialog" aria-label="Command palette">
      <label class="command-palette__input">
        <span aria-hidden="true">&gt;</span>
        <input
          v-model="query"
          autofocus
          placeholder="Type a command, panel, shortcut, or action"
          @keydown.enter.prevent="runFirstCommand"
          @keydown.escape="closeCommandPalette"
        />
      </label>
      <div v-if="filteredCommands.length > 0" class="command-palette__list" role="listbox">
        <button
          v-for="entry in filteredCommands"
          :key="entry.command.id"
          :class="{disabled: !entry.availability.enabled, danger: entry.command.dangerous}"
          :disabled="!entry.availability.enabled"
          :title="entry.availability.disabledReason ?? entry.command.description"
          type="button"
          role="option"
          @click="runCommand(entry.command.id)"
        >
          <span>
            <strong>{{ entry.command.title }}</strong>
            <small>{{ entry.availability.disabledReason ?? entry.command.description ?? entry.command.id }}</small>
          </span>
          <small>{{ entry.command.category ?? entry.command.group }}</small>
          <kbd v-if="entry.command.shortcut">{{ entry.command.shortcut }}</kbd>
        </button>
      </div>
      <EmptyState v-else compact icon="⌕" title="No commands found" description="Try searching for session, terminal, sftp, settings, or workspace." />
    </section>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {workspaceState} from '../../entities/workspace'
import {closeCommandPalette} from '../../features/workspace/open-command-palette/commandPalette'
import {executeCommand, getCommandAvailability, searchCommands} from '../../features/workspace/command-registry'
import {EmptyState} from '../../shared/ui'

const query = ref('')
const filteredCommands = computed(() => searchCommands(query.value).map((command) => ({command, availability: getCommandAvailability(command)})))

async function runCommand(commandId: string) {
  await executeCommand(commandId)
  closeCommandPalette()
  query.value = ''
}

async function runFirstCommand() {
  const firstCommand = filteredCommands.value.find((entry) => entry.availability.enabled)
  if (firstCommand) await runCommand(firstCommand.command.id)
}
</script>
