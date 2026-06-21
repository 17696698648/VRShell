<template><slot /></template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted} from 'vue'
import {registerSftpProgressEvents} from '../../features/sftp/progress-events/sftpProgressEvents'
import {startTerminalOutputPolling, stopTerminalOutputPolling} from '../../features/terminal/poll-output/pollTerminalOutput'

let disposeSftpProgressEvents: (() => void) | null = null

onMounted(() => {
  startTerminalOutputPolling()
  void registerSftpProgressEvents().then((dispose) => {
    disposeSftpProgressEvents = dispose
  })
})

onBeforeUnmount(() => {
  stopTerminalOutputPolling()
  disposeSftpProgressEvents?.()
  disposeSftpProgressEvents = null
})
</script>
