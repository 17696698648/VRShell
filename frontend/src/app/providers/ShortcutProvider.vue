<template><slot /></template>

<script setup lang="ts">
import {onBeforeUnmount} from 'vue'
import {registerGlobalShortcuts} from '../../features/workspace/global-shortcuts/globalShortcuts'
import {registerCommands} from '../../shared/command'
import {createAppCommands} from '../lifecycle/createAppCommands'

const disposeCommands = registerCommands(createAppCommands())
const disposeShortcuts = registerGlobalShortcuts()

onBeforeUnmount(() => {
  disposeShortcuts()
  disposeCommands()
})
</script>
