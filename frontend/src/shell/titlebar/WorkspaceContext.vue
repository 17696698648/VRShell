<template>
  <button class="workspace-context" type="button" :title="tooltip" aria-label="Open workspace quick switcher" @click="openQuickOpen">
    <span v-if="hasContext" class="workspace-context__workspace" aria-hidden="true">{{ workspaceInitial }}</span>
    <span class="workspace-context__main">
      <strong v-if="hasContext">{{ title }}</strong>
      <small v-if="hasContext"><UiOverflowText :text="subtitle" middle /></small>
    </span>
    <span class="workspace-context__status" :class="activeTerminal?.status ?? activeSession?.status" aria-hidden="true" />
    <UiKbd label="Ctrl+O" />
  </button>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {getActiveSession} from '../../entities/session'
import {terminalState} from '../../entities/terminal'
import {openQuickOpen} from '../../features/workspace/quick-open/quickOpen'
import {UiKbd, UiOverflowText} from '../../shared/ui'

const activeTerminal = computed(() => terminalState.tabs.find((tab) => tab.id === terminalState.activeTerminalId) ?? null)
const activeSession = computed(() => getActiveSession())
const hasContext = computed(() => Boolean(activeSession.value || activeTerminal.value))
const title = computed(() => activeSession.value?.name ?? activeTerminal.value?.title ?? '')
const subtitle = computed(() => {
  if (activeSession.value) return `${activeSession.value.username}@${activeSession.value.host}:${activeSession.value.port}`
  if (activeTerminal.value) return `${activeTerminal.value.cwd} · ${activeTerminal.value.status}`
  return ''
})
const workspaceInitial = computed(() => title.value.slice(0, 1).toUpperCase())
const tooltip = computed(() => hasContext.value ? `Quick switch workspace, sessions, and terminals (${subtitle.value})` : 'Quick switch workspace, sessions, and terminals')
</script>
