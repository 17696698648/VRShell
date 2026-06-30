import {describe, expect, it} from 'vitest'
import {getContextMenuPosition} from '../contextMenuPosition'

describe('getContextMenuPosition', () => {
  it('keeps the menu inside the viewport near bottom-right edges', () => {
    expect(getContextMenuPosition({
      menuHeight: 120,
      menuWidth: 180,
      requestedX: 780,
      requestedY: 590,
      viewportHeight: 600,
      viewportWidth: 800,
    })).toEqual({left: 612, top: 472})
  })

  it('keeps the menu away from top-left viewport edges', () => {
    expect(getContextMenuPosition({
      menuHeight: 120,
      menuWidth: 180,
      requestedX: -20,
      requestedY: -10,
      viewportHeight: 600,
      viewportWidth: 800,
    })).toEqual({left: 8, top: 8})
  })
})
