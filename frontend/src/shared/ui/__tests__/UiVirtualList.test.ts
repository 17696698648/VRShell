import {describe, expect, it} from 'vitest'
import source from '../UiVirtualList.vue?raw'

describe('UiVirtualList contracts', () => {
  it('renders only the visible window plus overscan', () => {
    expect(source).toContain('const startIndex = computed')
    expect(source).toContain('const visibleCount = computed')
    expect(source).toContain('props.items.slice(startIndex.value, startIndex.value + visibleCount.value)')
    expect(source).toContain('const offsetY = computed(() => startIndex.value * props.itemHeight)')
  })

  it('keeps spacer height based on total item count', () => {
    expect(source).toContain('const totalHeight = computed(() => props.items.length * props.itemHeight)')
    expect(source).toContain('ui-virtual-list__spacer')
    expect(source).toContain('data-scroll-height')
  })
})
