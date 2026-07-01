import type {PanelBodyState} from '../../../shared/ui'

export type SessionExplorerEmptyState = PanelBodyState<'search' | 'empty'>

export function getSessionExplorerEmptyState(query: string, favoriteOnly = false): SessionExplorerEmptyState {
  const trimmedQuery = query.trim()
  if (trimmedQuery || favoriteOnly) {
    return {
      description: favoriteOnly && !trimmedQuery ? 'No favorite sessions yet.' : `No sessions match “${trimmedQuery}”.`,
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
