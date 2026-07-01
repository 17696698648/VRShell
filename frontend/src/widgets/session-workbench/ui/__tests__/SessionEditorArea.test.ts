import {describe, expect, it} from 'vitest'
import source from '../SessionEditorArea.vue?raw'

describe('SessionEditorArea contracts', () => {
  it('shows save status and retry affordance for failed remote saves', () => {
    expect(source).toContain('activeFile.error')
    expect(source).toContain('Retry save')
    expect(source).toContain('saveActiveFile')
  })

  it('prevents duplicate remote saves while saving', () => {
    expect(source).toContain(':loading="activeFile.saving"')
    expect(source).toContain(':disabled="!activeFile.dirty || activeFile.saving"')
    expect(source).toContain('!activeFile.value.saving')
  })
})
