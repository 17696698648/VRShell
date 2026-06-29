<template>
  <button
    :class="['workspace-context', {'is-open': workspaceState.quickOpenOpen}]"
    type="button"
    title="Search workspace, sessions, commands"
    aria-label="Search workspace, sessions, commands"
    :aria-expanded="workspaceState.quickOpenOpen"
    @click="openQuickOpen"
  >
    <Search :size="13" aria-hidden="true" />
    <span>Search workspace, sessions, commands</span>
    <kbd>Ctrl K</kbd>
  </button>
</template>

<script setup lang="ts">
import {Search} from '@lucide/vue'
import {workspaceState} from '../../entities/workspace'
import {openQuickOpen} from '../../features/workspace/quick-open/quickOpen'
</script>
