import type {PanelBodyState} from '../../../shared/ui'

export type SftpBodyStateKind = 'error' | 'loading' | 'disconnected' | 'empty' | 'ready'

export interface SftpBodyStateCopy {
  emptyTitle: string
  emptyWithSession: string
  emptyWithoutSessionTitle: string
  emptyWithoutSession: string
  loadingDirectory: string
  unableToLoadDirectory: string
}

export interface SftpBodyStateInput {
  activeSession: boolean
  copy: SftpBodyStateCopy
  error: string
  itemCount: number
  loading: boolean
}

export type SftpBodyState = PanelBodyState<SftpBodyStateKind>

export function getSftpBodyState(input: SftpBodyStateInput): SftpBodyState {
  if (input.error) return {kind: 'error', title: input.copy.unableToLoadDirectory, description: input.error, icon: '!'}
  if (input.loading) return {kind: 'loading', title: input.copy.loadingDirectory, description: input.copy.loadingDirectory, icon: '…'}
  if (!input.activeSession) return {kind: 'disconnected', title: input.copy.emptyWithoutSessionTitle, description: input.copy.emptyWithoutSession, icon: '⏚'}
  if (input.itemCount === 0) return {kind: 'empty', title: input.copy.emptyTitle, description: input.copy.emptyWithSession, icon: '⇄'}
  return {kind: 'ready', title: '', description: '', icon: ''}
}
