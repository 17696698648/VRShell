import {describe, expect, it} from 'vitest'
import source from '../CommandPaletteHost.vue?raw'

describe('CommandPaletteHost contract', () => {
  it('shows command metadata including conflicts, recent state, and shortcuts', () => {
    expect(source).toContain('recentCommandIds')
    expect(source).toContain('command-palette__recent')
    expect(source).toContain('command-palette__conflict')
    expect(source).toContain('entrySubtitle')
    expect(source).toContain('UiKbd')
    expect(source).toContain('disabledReason')
  })
})
