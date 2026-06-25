export interface TerminalTab {
  id: string
  sessionId: string
  backendSessionId: string
  title: string
  status: 'connecting' | 'connected' | 'disconnected' | 'failed'
  cwd: string
  lines: string[]
  latency?: number // Network latency in milliseconds
}
