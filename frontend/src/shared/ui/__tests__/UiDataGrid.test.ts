import {describe, expect, it} from 'vitest'
import source from '../UiDataGrid.vue?raw'

describe('UiDataGrid contracts', () => {
  it('keeps keyboard navigation and selection emits wired', () => {
    expect(source).toContain('@keydown="handleGridKeydown"')
    expect(source).toContain("'ArrowDown'")
    expect(source).toContain("'ArrowUp'")
    expect(source).toContain("'Home'")
    expect(source).toContain("'End'")
    expect(source).toContain("emit('select', item, index, key)")
    expect(source).toContain("emit('activate', item, index)")
  })

  it('keeps ARIA grid, row, empty slot, and cell semantics', () => {
    expect(source).toContain('role="grid"')
    expect(source).toContain(':aria-rowcount="items.length + 1"')
    expect(source).toContain(':aria-colcount="columns.length"')
    expect(source).toContain('name="empty"')
    expect(source).toContain("'aria-rowindex': index + 2")
    expect(source).toContain("'aria-selected': selected")
    expect(source).toContain('getCellProps')
    expect(source).toContain("role: 'gridcell'")
    expect(source).toContain("'aria-colindex': columnIndex + 1")
  })

  it('keeps large datasets virtualized through UiVirtualList', () => {
    expect(source).toContain('import UiVirtualList')
    expect(source).toContain('<UiVirtualList v-else')
    expect(source).toContain(':items="items"')
    expect(source).toContain(':item-height="itemHeight"')
    expect(source).toContain(':get-key="getKey"')
  })
})
