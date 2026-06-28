<template>
  <section class="settings-section">
    <div><h3>Keybindings</h3><p>Command registry keeps menus, shortcuts, and command palette behavior consistent.</p></div>
    <p v-if="keybindingConflicts.length > 0" class="settings-warning">{{ keybindingConflicts.length }} shortcut conflicts detected. Review commands that share the same shortcut and scope.</p>
    <div class="settings-field settings-field--search"><UiInput v-model="keybindingQuery" label="Search keybindings" placeholder="Search by command, category, or shortcut" /></div>
    <div class="settings-keybindings" role="table" aria-label="Registered command keybindings">
      <div class="settings-keybindings__row settings-keybindings__row--header" role="row"><span>Command</span><span>Category</span><span>Shortcut</span><span>Scope</span></div>
      <div v-for="entry in filteredKeybindings" :key="entry.command.id" class="settings-keybindings__row" :class="{disabled: !entry.availability.enabled}" role="row">
        <span><strong>{{ entry.command.title }}</strong><small>{{ entry.availability.disabledReason ?? entry.command.description ?? entry.command.id }}</small></span>
        <span>{{ entry.command.category ?? entry.command.group }}</span><kbd>{{ entry.command.shortcut ?? '—' }}</kbd><span>{{ entry.command.scope ?? entry.command.group }}</span>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import {computed, ref} from 'vue'
import {getCommandAvailability, searchCommands} from '../../../shared/command'
import {UiInput} from '../../../shared/ui'
const keybindingQuery = ref('')
const filteredKeybindings = computed(() => searchCommands(keybindingQuery.value, {includeHidden: true}).filter((command) => command.shortcut || command.visibleInPalette !== false).map((command) => ({command, availability: getCommandAvailability(command)})))
const keybindingConflicts = computed(() => {
  const shortcutScopes = new Map<string, number>()
  for (const command of searchCommands('', {includeHidden: true})) {
    if (!command.shortcut) continue
    const key = `${command.scope ?? command.group}:${command.shortcut}`
    shortcutScopes.set(key, (shortcutScopes.get(key) ?? 0) + 1)
  }
  return Array.from(shortcutScopes.values()).filter((count) => count > 1)
})
</script>
