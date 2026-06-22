import {reactive} from 'vue'

export interface EditorTab {
  id: string
  path: string
  title: string
  content: string
}

export const editorState = reactive({
  activeTabId: '',
  tabs: [] as EditorTab[],
})

export function openEditorTab(tab: EditorTab) {
  const existing = editorState.tabs.find((item) => item.id === tab.id)
  if (existing) Object.assign(existing, tab)
  else editorState.tabs.push(tab)
  editorState.activeTabId = tab.id
}

export function closeEditorTab(tabId: string) {
  const index = editorState.tabs.findIndex((tab) => tab.id === tabId)
  if (index < 0) return
  editorState.tabs.splice(index, 1)
  if (editorState.activeTabId === tabId) editorState.activeTabId = editorState.tabs[Math.max(0, index - 1)]?.id ?? ''
}

export function activateEditorTab(tabId: string) {
  if (editorState.tabs.some((tab) => tab.id === tabId)) editorState.activeTabId = tabId
}
