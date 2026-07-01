import {describe, expect, it} from 'vitest'
import source from '../SessionCreateForm.vue?raw'

describe('SessionCreateForm contract', () => {
  it('teleports above workbench stacking contexts', () => {
    expect(source).toContain('<Teleport to="body">')
    expect(source).toContain('role="dialog"')
    expect(source).toContain('aria-modal="true"')
  })

  it('keeps cancel and submit actions wired', () => {
    expect(source).toContain('Create and connect')
    expect(source).toContain('@submit="(input) => emit(\'submit\', input)"')
    expect(source).toContain('@click="emit(\'close\')"')
  })
})
