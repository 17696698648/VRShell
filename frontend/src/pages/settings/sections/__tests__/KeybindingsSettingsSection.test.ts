import {describe, expect, it} from 'vitest'
import source from '../KeybindingsSettingsSection.vue?raw'

describe('KeybindingsSettingsSection contract', () => {
  it('surfaces conflicts, command status, and disabled reasons', () => {
    expect(source).toContain('keybindingConflicts')
    expect(source).toContain('settings-keybindings__conflicts')
    expect(source).toContain('settings-keybindings__status')
    expect(source).toContain('entry.availability.disabledReason')
    expect(source).toContain('Conflicts with')
  })
})
