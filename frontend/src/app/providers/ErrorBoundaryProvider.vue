<template><slot /></template>

<script setup lang="ts">
import {onBeforeUnmount, onErrorCaptured} from 'vue'
import {messages} from '../../shared/copy'
import {getErrorMessage} from '../../shared/error/getErrorMessage'
import {notifyAppError} from '../../shared/feedback'

function reportError(error: unknown) {
  const message = getErrorMessage(error)
  if (isResizeObserverLoopMessage(message)) return
  notifyAppError(error, {title: messages.app.errors.boundary, detail: message, action: 'app-error-boundary'})
}

function isResizeObserverLoopMessage(message: string) {
  return message.includes('ResizeObserver loop completed with undelivered notifications') || message.includes('ResizeObserver loop limit exceeded')
}

onErrorCaptured((error) => {
  reportError(error)
  return false
})

function onUnhandledRejection(event: PromiseRejectionEvent) {
  const message = getErrorMessage(event.reason)
  if (isResizeObserverLoopMessage(message)) {
    event.preventDefault()
    return
  }
  reportError(event.reason)
}

function onWindowError(event: ErrorEvent) {
  const message = getErrorMessage(event.error ?? event.message)
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
