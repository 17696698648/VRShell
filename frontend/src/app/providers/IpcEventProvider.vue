<template><slot /></template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted} from 'vue'
import {registerSftpProgressEvents} from '../../features/sftp/progress-events/sftpProgressEvents'
import {createTerminalEventProvider} from '../../features/terminal/events/terminalEventProvider'

const terminalEventProvider = createTerminalEventProvider()
let disposeSftpProgressEvents: (() => void) | null = null

onMounted(() => {
  terminalEventProvider.start()
  void registerSftpProgressEvents().then((dispose) => {
    disposeSftpProgressEvents = dispose
  })
})

onBeforeUnmount(() => {
  terminalEventProvider.stop()
  disposeSftpProgressEvents?.()
  disposeSftpProgressEvents = null
})
</script>
