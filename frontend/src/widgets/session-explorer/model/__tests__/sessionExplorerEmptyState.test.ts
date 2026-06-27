import {describe, expect, it} from 'vitest'
import {getSessionExplorerEmptyState} from '../sessionExplorerEmptyState'

describe('getSessionExplorerEmptyState', () => {
  it('returns the inventory empty state when no query is active', () => {
    expect(getSessionExplorerEmptyState('')).toEqual({
      description: 'Create a session or import your SSH config to get started.',
      icon: '⌁',
      kind: 'empty',
      title: 'No sessions yet',
    })
  })

  it('returns the search empty state with a trimmed query', () => {
    expect(getSessionExplorerEmptyState('  prod-db  ')).toEqual({
      description: 'No sessions match “prod-db”.',
      icon: '⌕',
      kind: 'search',
      title: 'No matching sessions',
    })
  })
})
