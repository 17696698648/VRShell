type EventMap = Record<string, unknown>
type EventHandler<TPayload> = (payload: TPayload) => void

export function createEventBus<TEvents extends EventMap>() {
  const listeners = new Map<keyof TEvents, Set<EventHandler<TEvents[keyof TEvents]>>>()

  function on<TKey extends keyof TEvents>(type: TKey, handler: EventHandler<TEvents[TKey]>) {
    const handlers = listeners.get(type) ?? new Set<EventHandler<TEvents[keyof TEvents]>>()
    handlers.add(handler as EventHandler<TEvents[keyof TEvents]>)
    listeners.set(type, handlers)
    return () => handlers.delete(handler as EventHandler<TEvents[keyof TEvents]>)
  }

  function emit<TKey extends keyof TEvents>(type: TKey, payload: TEvents[TKey]) {
    for (const handler of listeners.get(type) ?? []) handler(payload)
  }

  return {on, emit}
}
