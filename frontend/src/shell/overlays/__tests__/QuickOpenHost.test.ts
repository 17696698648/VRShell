import {describe, expect, it} from 'vitest'
import source from '../QuickOpenHost.vue?raw'

describe('QuickOpenHost accessibility contract', () => {
  it('exposes combobox and listbox relationships', () => {
    expect(source).toContain('role="combobox"')
    expect(source).toContain('aria-autocomplete="list"')
    expect(source).toContain('aria-controls="quick-open-listbox"')
    expect(source).toContain(':aria-activedescendant="selectedItem ? optionId(selectedItem.id) : undefined"')
    expect(source).toContain('id="quick-open-listbox"')
    expect(source).toContain('role="listbox"')
    expect(source).toContain('role="option"')
    expect(source).toContain(':aria-selected="isSelected(item.id)"')
  })

  it('delegates quick-open state to the composable', () => {
    expect(source).toContain('useQuickOpenState(() => sessionState.sessions, () => terminalState.tabs)')
    expect(source).toContain('moveUp()')
    expect(source).toContain('moveDown()')
    expect(source).toContain('highlightQuickOpenMatch(text, query.value)')
    expect(source).toContain('Switch session or terminal by name, host, #tag, favorite, or cwd')
  })
})
