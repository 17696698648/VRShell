import {describe, expect, it} from 'vitest'
import source from '../ContextMenuHost.vue?raw'

describe('ContextMenuHost contract', () => {
  it('closes from outside pointer interactions and clamps to the viewport', () => {
    expect(source).toContain('@pointerdown.self="closeContextMenu"')
    expect(source).toContain('@contextmenu.prevent="closeContextMenu"')
    expect(source).toContain('getContextMenuPosition')
    expect(source).toContain('getBoundingClientRect')
  })
})
