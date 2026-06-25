<template><slot /></template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted} from 'vue'
import {requestHostKeyConfirmation} from '../../entities/security/model/hostKeyState'
import {registerSftpProgressEvents} from '../../features/sftp/progress-events/sftpProgressEvents'
import {restoreSftpTasks} from '../../features/task/manage-task/manageTask'
import {createTerminalEventProvider} from '../../features/terminal/events/terminalEventProvider'
import {listenTypedEvent} from '../../shared/ipc/ipcEvents'

const terminalEventProvider = createTerminalEventProvider()
let disposeSftpProgressEvents: (() => void) | null = null
let disposeHostKeyListener: (() => void) | null = null

onMounted(() => {
  terminalEventProvider.start()
  void restoreSftpTasks()
  void registerSftpProgressEvents().then((dispose) => {
    disposeSftpProgressEvents = dispose
  })
  void listenTypedEvent('security-hostKeyRequested', (event) => {
    void requestHostKeyConfirmation(event)
  }).then((dispose) => {
    disposeHostKeyListener = dispose
  })
})

onBeforeUnmount(() => {
  terminalEventProvider.stop()
  disposeSftpProgressEvents?.()
  disposeSftpProgressEvents = null
  disposeHostKeyListener?.()
  disposeHostKeyListener = null
})
</script>
