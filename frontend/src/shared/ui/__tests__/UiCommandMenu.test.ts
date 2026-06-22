import {describe, expect, it} from 'vitest'
import source from '../UiCommandMenu.vue?raw'

describe('UiCommandMenu contracts', () => {
  it('keeps auto focus, Enter/Escape handling, and typeahead', () => {
    expect(source).toContain('ref="menuRef"')
    expect(source).toContain('onMounted(() => focusFirstItem())')
    expect(source).toContain('watch(enabledCommands, () => nextTick(focusFirstItem))')
    expect(source).toContain("event.key === 'Escape'")
    expect(source).toContain("event.key === 'Enter'")
    expect(source).toContain('document.activeElement.click()')
    expect(source).toContain('focusTypeahead')
    expect(source).toContain('isPrintableKey')
  })

  it('keeps menu roles and disabled item tab model', () => {
    expect(source).toContain('role="menu"')
    expect(source).toContain('role="menuitem"')
    expect(source).toContain(':tabindex="item.availability.enabled ? 0 : -1"')
    expect(source).toContain('button:not(:disabled)')
  })
})
