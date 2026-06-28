import {describe, expect, it} from 'vitest'
import source from '../SessionExplorer.vue?raw'

describe('SessionExplorer empty state contract', () => {
  it('uses the shared EmptyState component with contextual actions', () => {
    expect(source).toContain('<EmptyState v-if="showEmptyState" compact')
    expect(source).toContain('session-search-toggle')
    expect(source).toContain('session-search-bar')
    expect(source).toContain('aria-label="Search sessions"')
    expect(source).toContain("import {getSessionExplorerEmptyState} from '../model/sessionExplorerEmptyState'")
    expect(source).toContain('const emptyState = computed(() => getSessionExplorerEmptyState(query.value))')
    expect(source).toContain('emptyState.kind === \'search\'')
    expect(source).toContain('@click="openCreateDialog()"')
    expect(source).toContain('@click="handleImport"')
  })
})
