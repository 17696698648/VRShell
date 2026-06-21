<template><slot /></template>

<script setup lang="ts">
import {onBeforeUnmount, onErrorCaptured} from 'vue'
import {pushToast} from '../../shared/feedback'

function reportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  pushToast({level: 'error', title: 'Application error', detail: message})
}

onErrorCaptured((error) => {
  reportError(error)
  return false
})

function onUnhandledRejection(event: PromiseRejectionEvent) {
  reportError(event.reason)
}

function onWindowError(event: ErrorEvent) {
  reportError(event.error ?? event.message)
}

window.addEventListener('unhandledrejection', onUnhandledRejection)
window.addEventListener('error', onWindowError)

onBeforeUnmount(() => {
  window.removeEventListener('unhandledrejection', onUnhandledRejection)
  window.removeEventListener('error', onWindowError)
})
</script>
