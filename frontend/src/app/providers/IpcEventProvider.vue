<template><slot /></template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted} from 'vue'
import {registerSftpProgressEvents} from '../../features/sftp/progress-events/sftpProgressEvents'
import {restoreSftpTasks} from '../../features/task/manage-task/manageTask'
import {createTerminalEventProvider} from '../../features/terminal/events/terminalEventProvider'

const terminalEventProvider = createTerminalEventProvider()
let disposeSftpProgressEvents: (() => void) | null = null

onMounted(() => {
  terminalEventProvider.start()
  void restoreSftpTasks()
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
