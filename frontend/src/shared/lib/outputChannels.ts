import {reactive} from 'vue'
import {createId} from './createId'
import {sanitizeSensitiveText} from './sanitizeSensitiveText'

export type OutputChannel = 'SSH' | 'SFTP' | 'Terminal' | 'Task' | 'IPC' | 'UI'

export interface OutputEntry {
  id: string
  channel: OutputChannel
  message: string
  timestamp: number
}

export const outputState = reactive({
  entries: [] as OutputEntry[],
})

export function writeOutput(channel: OutputChannel, message: string) {
  const entry = {channel, id: createId('output'), message: sanitizeSensitiveText(message), timestamp: Date.now()}
  outputState.entries.unshift(entry)
  outputState.entries.splice(300)
  return entry
}

export function clearOutput() {
  outputState.entries.splice(0, outputState.entries.length)
}
