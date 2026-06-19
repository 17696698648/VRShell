import type { ComputedRef, Ref } from 'vue'
import { computed, ref } from 'vue'
import { useResizablePane } from './useResizablePane'

export type AppDrawerName = 'sessions' | 'sftp'

export const activityBarWidth = 48
export const minDrawerWidth = 280
export const maxDrawerWidth = 420
export const minEditorPaneHeight = 120
export const maxEditorPaneHeight = 420

export type AppLayoutWorkspace = {
  showEditorArea: boolean
  editorPaneHeight: number
}

export function useAppLayoutState({
  activeWorkspace,
  onResize,
}: {
  activeWorkspace: ComputedRef<AppLayoutWorkspace>
  onResize: () => void
}) {
  const activeDrawer = ref<AppDrawerName | null>('sessions')
  const { size: drawerWidth, startResize } = useResizablePane({
    initialSize: minDrawerWidth,
    minSize: minDrawerWidth,
    maxSize: maxDrawerWidth,
    axis: 'x',
    onResize,
  })
  const showEditorArea = computed({
    get: () => activeWorkspace.value.showEditorArea,
    set: (value) => (activeWorkspace.value.showEditorArea = value),
  })
  const editorPaneHeight = computed({
    get: () => activeWorkspace.value.editorPaneHeight,
    set: (value) => (activeWorkspace.value.editorPaneHeight = value),
  })
  const { startResize: startWorkbenchResize } = useResizablePane({
    initialSize: 230,
    minSize: minEditorPaneHeight,
    maxSize: maxEditorPaneHeight,
    axis: 'y',
    sizeRef: editorPaneHeight as Ref<number>,
    onResize,
  })

  return {
    activeDrawer,
    drawerWidth,
    editorPaneHeight,
    maxDrawerWidth,
    maxEditorPaneHeight,
    minDrawerWidth,
    minEditorPaneHeight,
    showEditorArea,
    startResize,
    startWorkbenchResize,
  }
}
