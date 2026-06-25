import { createPinia } from 'pinia'

export const pinia = createPinia()

export { useSessionStore } from './sessionStore'
export { useTerminalStore } from './terminalStore'
export { useSftpTaskStore } from './sftpTaskStore'
