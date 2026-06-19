export {}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      metadata: {
        currentWindow: { label: string }
        currentWebview: { label: string }
      }
      transformCallback: (callback: (event: unknown) => void) => number
      invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>
    }
  }
}
