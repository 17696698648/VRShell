import {executeCommand, getCommand, getCommandAvailability} from '../../shared/command'
import type {ContextMenuItem} from './contextMenuStore'

export function createCommandMenuItems(commandIds: string[]): ContextMenuItem[] {
  return commandIds.flatMap((commandId) => {
    const command = getCommand(commandId)
    if (!command || command.visibleInMenu === false) return []
    const availability = getCommandAvailability(command)
    if (!availability.visible) return []
    return [
      {
        id: command.id,
        label: command.shortcut ? `${command.title}\t${command.shortcut}` : command.title,
        danger: command.dangerous,
        disabled: !availability.enabled,
        run: () => executeCommand(command.id),
      },
    ]
  })
}
