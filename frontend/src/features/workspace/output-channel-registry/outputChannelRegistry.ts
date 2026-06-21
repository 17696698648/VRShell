import {computed, reactive} from 'vue'
import type {OutputChannel} from '../../../shared/lib/outputChannels'

export interface OutputChannelRegistration {
  id: OutputChannel
  title: string
  order?: number
}

const outputChannels = reactive(new Map<OutputChannel, OutputChannelRegistration>())

export function registerOutputChannel(channel: OutputChannelRegistration) {
  outputChannels.set(channel.id, channel)
  return () => outputChannels.delete(channel.id)
}

export function useOutputChannels() {
  return computed(() => Array.from(outputChannels.values()).sort((left, right) => (left.order ?? 100) - (right.order ?? 100)))
}
