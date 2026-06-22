import {describe, expect, it} from 'vitest'
import source from '../UiTree.vue?raw'

describe('UiTree contracts', () => {
  it('keeps keyboard navigation, selection, and toggle emits wired', () => {
    expect(source).toContain('@keydown="handleKeydown"')
    expect(source).toContain("'ArrowDown'")
    expect(source).toContain("'ArrowUp'")
    expect(source).toContain("'ArrowRight'")
    expect(source).toContain("'ArrowLeft'")
    expect(source).toContain("emit('select', item, index, props.getKey(item, index))")
    expect(source).toContain("emit('toggle', item, index, props.getKey(item, index))")
  })

  it('keeps ARIA level, expanded state, and selection model', () => {
    expect(source).toContain("'aria-expanded': hasChildren(key) ? expanded : undefined")
    expect(source).toContain("'aria-level': props.getLevel(item, index)")
    expect(source).toContain("'aria-selected': selected")
    expect(source).toContain("role: 'treeitem'")
    expect(source).toContain('selectedKey')
    expect(source).toContain('expandedKeys')
  })
})
