<template><slot /></template>

<script setup lang="ts">
import {onBeforeUnmount, watch} from 'vue'
import {sessionState} from '../../entities/session'
import {workspaceState} from '../../entities/workspace'
import {persistState} from '../lifecycle/persistence'

const stopPersistence = watch(
  () => [
    sessionState.activeSessionId,
    sessionState.groups,
    sessionState.sessions,
    workspaceState.activePanel,
    workspaceState.theme,
  ],
  () => persistState(),
  {deep: true},
)

window.addEventListener('beforeunload', persistState)

onBeforeUnmount(() => {
  stopPersistence()
  window.removeEventListener('beforeunload', persistState)
})
</script>
