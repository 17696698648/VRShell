<template><slot /></template>

<script setup lang="ts">
import {onBeforeUnmount, onErrorCaptured} from 'vue'
import {messages} from '../../shared/copy'
import {notifyError} from '../../shared/feedback'

function reportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (isResizeObserverLoopMessage(message)) return
  notifyError({title: messages.app.errors.boundary, detail: message})
}

function isResizeObserverLoopMessage(message: string) {
  return message.includes('ResizeObserver loop completed with undelivered notifications') || message.includes('ResizeObserver loop limit exceeded')
}

onErrorCaptured((error) => {
  reportError(error)
  return false
})

function onUnhandledRejection(event: PromiseRejectionEvent) {
  const message = event.reason instanceof Error ? event.reason.message : String(event.reason)
  if (isResizeObserverLoopMessage(message)) {
    event.preventDefault()
    return
  }
  reportError(event.reason)
}

function onWindowError(event: ErrorEvent) {
  const message = event.error instanceof Error ? event.error.message : event.message
  if (isResizeObserverLoopMessage(message)) {
    event.preventDefault()
    return
  }
  reportError(event.error ?? event.message)
}

window.addEventListener('unhandledrejection', onUnhandledRejection)
window.addEventListener('error', onWindowError)

onBeforeUnmount(() => {
  window.removeEventListener('unhandledrejection', onUnhandledRejection)
  window.removeEventListener('error', onWindowError)
})
</script>
