<template>
  <section class="settings-section">
    <div><h3>Keybindings</h3><p>Command registry keeps menus, shortcuts, and command palette behavior consistent.</p></div>
    <p v-if="keybindingConflicts.length > 0" class="settings-warning">{{ keybindingConflicts.length }} shortcut conflicts detected. Review commands that share the same shortcut and scope.</p>
    <div v-if="keybindingConflicts.length > 0" class="settings-keybindings__conflicts" aria-label="Shortcut conflicts">
      <span v-for="conflict in keybindingConflicts" :key="conflict.key">{{ conflict.shortcut }} · {{ conflict.scope }}: {{ conflict.titles.join(', ') }}</span>
    </div>
    <div class="settings-field settings-field--search"><UiInput v-model="keybindingQuery" label="Search keybindings" placeholder="Search by command, category, or shortcut" /></div>
    <div class="settings-keybindings" role="table" aria-label="Registered command keybindings">
      <div class="settings-keybindings__row settings-keybindings__row--header" role="row"><span>Command</span><span>Category</span><span>Shortcut</span><span>Scope</span><span>Status</span></div>
      <div v-for="entry in filteredKeybindings" :key="entry.command.id" class="settings-keybindings__row" :class="{disabled: !entry.availability.enabled, conflict: entry.conflict}" role="row">
        <span><strong>{{ entry.command.title }}</strong><small>{{ entryDetail(entry) }}</small></span>
        <span>{{ entry.command.category ?? entry.command.group }}</span><kbd>{{ entry.command.shortcut ?? '—' }}</kbd><span>{{ entry.command.scope ?? entry.command.group }}</span>
        <span class="settings-keybindings__status">
          <small v-if="entry.conflict" class="warning">Conflict</small>
          <small v-else-if="entry.availability.disabledReason" class="muted">Disabled</small>
          <small v-else>Ready</small>
        </span>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import {computed, ref} from 'vue'
import {getCommandAvailability, searchCommands, type AppCommand, type CommandAvailability} from '../../../shared/command'
import {UiInput} from '../../../shared/ui'

type KeybindingEntry = {
  availability: CommandAvailability
  command: AppCommand
  conflict: ShortcutConflict | null
}

type ShortcutConflict = {
  key: string
  scope: string
  shortcut: string
  titles: string[]
}

const keybindingQuery = ref('')
const allCommands = computed(() => searchCommands('', {includeHidden: true}))
const conflictByCommandId = computed(() => {
  const groups = new Map<string, AppCommand[]>()
  for (const command of allCommands.value) {
    if (!command.shortcut) continue
    const key = shortcutScopeKey(command)
    groups.set(key, [...(groups.get(key) ?? []), command])
  }
  const byCommandId = new Map<string, ShortcutConflict>()
  for (const [key, commands] of groups) {
    if (commands.length <= 1) continue
    const [scope, shortcut] = key.split(':')
    const conflict: ShortcutConflict = {key, scope, shortcut, titles: commands.map((command) => command.title)}
    commands.forEach((command) => byCommandId.set(command.id, conflict))
  }
  return byCommandId
})
const filteredKeybindings = computed<KeybindingEntry[]>(() => searchCommands(keybindingQuery.value, {includeHidden: true})
  .filter((command) => command.shortcut || command.visibleInPalette !== false)
  .map((command) => ({command, availability: getCommandAvailability(command), conflict: conflictByCommandId.value.get(command.id) ?? null})))
const keybindingConflicts = computed(() => Array.from(new Set(conflictByCommandId.value.values())))

function entryDetail(entry: KeybindingEntry) {
  if (entry.conflict) return `Conflicts with ${entry.conflict.titles.filter((title) => title !== entry.command.title).join(', ')}`
  return entry.availability.disabledReason ?? entry.command.description ?? entry.command.id
}

function shortcutScopeKey(command: AppCommand) {
  return `${command.scope ?? command.group}:${command.shortcut}`
}
</script>
