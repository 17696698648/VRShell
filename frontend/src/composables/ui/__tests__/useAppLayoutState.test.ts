import { computed } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { maxDrawerWidth, minDrawerWidth, useAppLayoutState } from '../useAppLayoutState'

describe('useAppLayoutState', () => {
  beforeEach(() => {
    const listeners = new Map<string, Array<(event: MouseEvent) => void>>()
    vi.stubGlobal('window', {
      addEventListener: vi.fn((eventName: string, listener: (event: MouseEvent) => void) => {
        listeners.set(eventName, [...(listeners.get(eventName) ?? []), listener])
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn((event: MouseEvent) => {
        listeners.get(event.type)?.forEach((listener) => listener(event))
      }),
    })
  })

  it('proxies editor layout state to active workspace', () => {
    const workspace = { showEditorArea: false, editorPaneHeight: 230 }
    const layout = useAppLayoutState({
      activeWorkspace: computed(() => workspace),
      onResize: vi.fn(),
    })

    layout.showEditorArea.value = true
    layout.editorPaneHeight.value = 320

    expect(workspace.showEditorArea).toBe(true)
    expect(workspace.editorPaneHeight).toBe(320)
  })

  it('clamps drawer resize within configured bounds', () => {
    const onResize = vi.fn()
    const layout = useAppLayoutState({
      activeWorkspace: computed(() => ({ showEditorArea: false, editorPaneHeight: 230 })),
      onResize,
    })

    layout.startResize({ clientX: 0 } as MouseEvent)
    window.dispatchEvent({ type: 'mousemove', clientX: 1000 } as MouseEvent)

    expect(layout.drawerWidth.value).toBe(maxDrawerWidth)
    expect(onResize).toHaveBeenCalledTimes(1)

    window.dispatchEvent({ type: 'mousemove', clientX: -1000 } as MouseEvent)

    expect(layout.drawerWidth.value).toBe(minDrawerWidth)
  })
})
