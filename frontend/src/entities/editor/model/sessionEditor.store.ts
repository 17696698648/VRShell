import {reactive} from 'vue'

export interface SessionEditorFile {
  id: string
  sessionId: string
  path: string
  title: string
  content: string
}

export const sessionEditorState = reactive({
  activeFileIdBySession: {} as Record<string, string>,
  files: [] as SessionEditorFile[],
  splitRatioBySession: {} as Record<string, number>,
})

export function openSessionEditorFile(file: SessionEditorFile) {
  const existing = sessionEditorState.files.find((item) => item.id === file.id)
  if (existing) Object.assign(existing, file)
  else sessionEditorState.files.push(file)
  sessionEditorState.activeFileIdBySession[file.sessionId] = file.id
}

export function getSessionEditorFile(sessionId: string) {
  const activeFileId = sessionEditorState.activeFileIdBySession[sessionId]
  return sessionEditorState.files.find((file) => file.id === activeFileId) ?? null
}

export function setSessionEditorSplitRatio(sessionId: string, ratio: number) {
  sessionEditorState.splitRatioBySession[sessionId] = ratio
}

export function getSessionEditorSplitRatio(sessionId: string) {
  return sessionEditorState.splitRatioBySession[sessionId] ?? 42
}
