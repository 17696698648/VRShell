import {createTerminalEventProvider} from '../events/terminalEventProvider'

const terminalEventProvider = createTerminalEventProvider()

export function startTerminalOutputPolling() {
  terminalEventProvider.start()
}

export function stopTerminalOutputPolling() {
  terminalEventProvider.stop()
}
