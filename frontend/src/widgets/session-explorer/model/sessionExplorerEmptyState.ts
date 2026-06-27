import type {PanelBodyState} from '../../../shared/ui'

export type SessionExplorerEmptyState = PanelBodyState<'search' | 'empty'>

export function getSessionExplorerEmptyState(query: string): SessionExplorerEmptyState {
  const trimmedQuery = query.trim()
  if (trimmedQuery) {
    return {
      description: `No sessions match “${trimmedQuery}”.`,
      icon: '⌕',
      kind: 'search',
      title: 'No matching sessions',
    }
  }
  return {
    description: 'Create a session or import your SSH config to get started.',
    icon: '⌁',
    kind: 'empty',
    title: 'No sessions yet',
  }
}
