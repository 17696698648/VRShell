import {executeCommand, getCommandAvailability, getCommands} from '../command-registry'

export function registerGlobalShortcuts() {
  if (typeof window === 'undefined') return () => {}

  function onKeyDown(event: KeyboardEvent) {
    if (shouldIgnoreShortcut(event)) return
    const shortcut = eventToShortcut(event)
    const command = getCommands()
      .filter((item) => item.shortcut)
      .find((item) => normalizeShortcut(item.shortcut ?? '') === shortcut && getCommandAvailability(item).enabled)
    if (!command) return
    event.preventDefault()
    void executeCommand(command.id)
  }

  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}

function shouldIgnoreShortcut(event: KeyboardEvent) {
  const target = event.target
  if (!isHtmlElement(target)) return false
  const tagName = target.tagName.toLowerCase()
  const isTextInput = tagName === 'input' || tagName === 'textarea' || target.isContentEditable
  if (!isTextInput) return false
  return !(event.ctrlKey || event.metaKey)
}

function isHtmlElement(target: EventTarget | null): target is HTMLElement {
  if (!target || typeof HTMLElement === 'undefined') return false
  return target instanceof HTMLElement
}

function eventToShortcut(event: KeyboardEvent) {
  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl')
  if (event.shiftKey) parts.push('Shift')
  if (event.altKey) parts.push('Alt')
  parts.push(event.key.length === 1 ? event.key.toUpperCase() : event.key)
  return parts.join('+')
}

function normalizeShortcut(shortcut: string) {
  return shortcut.split('+').map((part) => part.length === 1 ? part.toUpperCase() : part).join('+')
}
