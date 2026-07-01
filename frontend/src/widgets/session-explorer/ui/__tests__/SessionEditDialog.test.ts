import {describe, expect, it} from 'vitest'
import source from '../SessionEditDialog.vue?raw'

describe('SessionEditDialog contract', () => {
  it('passes tags into the form and exposes connection testing', () => {
    expect(source).toContain('tags: props.session.tags')
    expect(source).toContain('Test connection')
    expect(source).toContain('terminalApi.open')
    expect(source).toContain('terminalApi.close')
    expect(source).toContain('dialog__status')
  })

  it('teleports above workbench stacking contexts', () => {
    expect(source).toContain('<Teleport to="body">')
  })
})
