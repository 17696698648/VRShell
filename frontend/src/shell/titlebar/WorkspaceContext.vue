<template>
  <button
    :class="['workspace-context', {'is-open': workspaceState.quickOpenOpen}]"
    type="button"
    title="Search workspace, sessions, commands"
    aria-label="Search workspace, sessions, commands"
    aria-haspopup="dialog"
    :aria-expanded="workspaceState.quickOpenOpen"
    @click="openQuickOpen"
  >
    <Search :size="13" aria-hidden="true" />
    <span>Search workspace</span>
    <kbd>Ctrl+K</kbd>
    <ChevronDown :size="12" class="workspace-context__chevron" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
import {ChevronDown, Search} from '@lucide/vue'
import {workspaceState} from '../../entities/workspace'
import {openQuickOpen} from '../../features/workspace/quick-open/quickOpen'
</script>
