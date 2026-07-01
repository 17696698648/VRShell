import {describe, expect, it} from 'vitest'
import source from '../SessionTreeNode.vue?raw'

describe('SessionTreeNode contract', () => {
  it('exposes duplicate, favorite, copy target actions and tag indicators', () => {
    expect(source).toContain('Duplicate')
    expect(source).toContain('Add to favorites')
    expect(source).toContain('Copy SSH target')
    expect(source).toContain('session-node__favorite')
    expect(source).toContain('session-node__tags')
  })
})
