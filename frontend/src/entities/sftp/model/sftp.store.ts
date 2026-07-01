import {reactive} from 'vue'
import type {SftpItem} from './sftp.types'

export interface SftpDirectoryTreeState {
  selectedPath: string | null
  expandedPaths: string[]
  childrenByPath: Record<string, SftpItem[]>
}

export interface SftpSessionState {
  connectedSessionId: string
  initialized: boolean
  path: string
  nextCursor: string | null
  hasMore: boolean
  loading: boolean
  error: string
  selectedItemId: string
  items: SftpItem[]
  tree: SftpDirectoryTreeState
}

function createSftpSessionState(sessionId = ''): SftpSessionState {
  return {
    connectedSessionId: sessionId,
    initialized: false,
    path: '/',
    nextCursor: null,
    hasMore: false,
    loading: false,
    error: '',
    selectedItemId: '',
    items: [],
    tree: {
      selectedPath: null,
      expandedPaths: [],
      childrenByPath: {},
    },
  }
}

function cloneTreeState(tree: SftpDirectoryTreeState): SftpDirectoryTreeState {
  return {
    selectedPath: tree.selectedPath,
    expandedPaths: [...tree.expandedPaths],
    childrenByPath: Object.fromEntries(Object.entries(tree.childrenByPath).map(([path, children]) => [path, [...children]])),
  }
}

export const sftpState = reactive(createSftpSessionState())

export const sftpSessionStates = reactive<Record<string, SftpSessionState>>({})

export function getSftpSessionState(sessionId: string) {
  if (!sftpSessionStates[sessionId]) sftpSessionStates[sessionId] = createSftpSessionState(sessionId)
  return sftpSessionStates[sessionId]
}

export function activateSftpSessionState(sessionId: string) {
  const sessionState = getSftpSessionState(sessionId)
  Object.assign(sftpState, sessionState)
  sftpState.tree = cloneTreeState(sessionState.tree)
}

export function persistActiveSftpState() {
  if (!sftpState.connectedSessionId) return
  const sessionState = getSftpSessionState(sftpState.connectedSessionId)
  Object.assign(sessionState, sftpState)
  sessionState.tree = cloneTreeState(sftpState.tree)
}

export function removeSftpSessionState(sessionId: string) {
  delete sftpSessionStates[sessionId]
  if (sftpState.connectedSessionId === sessionId) clearSftpState()
}

export function setSftpItems(path: string, items: SftpItem[]) {
  sftpState.path = path
  sftpState.nextCursor = null
  sftpState.hasMore = false
  sftpState.items = items
  persistActiveSftpState()
}

export function setSftpConnected(sessionId: string) {
  sftpState.connectedSessionId = sessionId
  sftpState.initialized = true
  persistActiveSftpState()
}

export function clearSftpState() {
  sftpState.connectedSessionId = ''
  sftpState.initialized = false
  sftpState.path = '/'
  sftpState.nextCursor = null
  sftpState.hasMore = false
  sftpState.loading = false
  sftpState.error = ''
  sftpState.selectedItemId = ''
  sftpState.items = []
  sftpState.tree = createSftpSessionState().tree
}
