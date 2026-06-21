import type {AppCommand, CommandAvailability} from './command.types'

const commandMap = new Map<string, AppCommand>()
const recentCommandIds: string[] = []

export function registerCommand(command: AppCommand) {
  commandMap.set(command.id, command)
  return () => commandMap.delete(command.id)
}

export function registerCommands(commands: AppCommand[]) {
  const disposables = commands.map(registerCommand)
  return () => disposables.forEach((dispose) => dispose())
}

export function getCommands() {
  return Array.from(commandMap.values())
}

export function getCommand(commandId: string) {
  return commandMap.get(commandId) ?? null
}

export function getRecentCommandIds() {
  return [...recentCommandIds]
}

export function getCommandAvailability(command: AppCommand): CommandAvailability {
  const visible = command.when?.() ?? true
  const disabledReason = visible ? command.disabledReason?.() ?? null : null
  return {
    disabledReason,
    enabled: visible && !disabledReason,
    visible,
  }
}

export function searchCommands(query: string, options: {includeHidden?: boolean} = {}) {
  const keyword = query.trim().toLowerCase()
  return getCommands()
    .filter((command) => options.includeHidden || command.visibleInPalette !== false)
    .filter((command) => options.includeHidden || getCommandAvailability(command).visible)
    .filter((command) => !keyword || getCommandSearchText(command).includes(keyword))
    .sort((left, right) => getCommandScore(right, keyword) - getCommandScore(left, keyword) || getCommandTitle(left).localeCompare(getCommandTitle(right)))
}

export async function executeCommand(commandId: string, payload?: unknown) {
  const command = getCommand(commandId)
  if (!command) throw new Error(`Command not found: ${commandId}`)
  const availability = getCommandAvailability(command)
  if (!availability.visible) return
  if (availability.disabledReason) throw new Error(availability.disabledReason)
  await command.run(payload)
  rememberCommand(commandId)
}

export function clearCommands() {
  commandMap.clear()
  recentCommandIds.length = 0
}

function rememberCommand(commandId: string) {
  const existingIndex = recentCommandIds.indexOf(commandId)
  if (existingIndex >= 0) recentCommandIds.splice(existingIndex, 1)
  recentCommandIds.unshift(commandId)
  recentCommandIds.splice(8)
}

function getCommandTitle(command: AppCommand) {
  return `${command.category ?? command.group}:${command.title}`
}

function getCommandSearchText(command: AppCommand) {
  return [command.title, command.category, command.group, command.description, command.shortcut, command.id, ...(command.keywords ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function getCommandScore(command: AppCommand, keyword: string) {
  const recentScore = Math.max(0, 8 - recentCommandIds.indexOf(command.id))
  const priorityScore = command.priority ?? 0
  if (!keyword) return recentScore + priorityScore
  const title = command.title.toLowerCase()
  const category = (command.category ?? command.group).toLowerCase()
  if (title === keyword) return 1000 + recentScore + priorityScore
  if (title.startsWith(keyword)) return 800 + recentScore + priorityScore
  if (category.includes(keyword)) return 400 + recentScore + priorityScore
  return recentScore + priorityScore
}
