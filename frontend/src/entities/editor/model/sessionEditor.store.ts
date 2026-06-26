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

export function getSessionEditorFiles(sessionId: string) {
  return sessionEditorState.files.filter((file) => file.sessionId === sessionId)
}

export function activateSessionEditorFile(sessionId: string, fileId: string) {
  if (sessionEditorState.files.some((file) => file.sessionId === sessionId && file.id === fileId)) {
    sessionEditorState.activeFileIdBySession[sessionId] = fileId
  }
}

export function closeSessionEditorFile(sessionId: string, fileId: string) {
  const fileIndex = sessionEditorState.files.findIndex((file) => file.sessionId === sessionId && file.id === fileId)
  if (fileIndex < 0) return
  sessionEditorState.files.splice(fileIndex, 1)
  if (sessionEditorState.activeFileIdBySession[sessionId] !== fileId) return
  const nextFile = sessionEditorState.files.find((file) => file.sessionId === sessionId)
  if (nextFile) sessionEditorState.activeFileIdBySession[sessionId] = nextFile.id
  else delete sessionEditorState.activeFileIdBySession[sessionId]
}

export function setSessionEditorSplitRatio(sessionId: string, ratio: number) {
  sessionEditorState.splitRatioBySession[sessionId] = ratio
}

export function getSessionEditorSplitRatio(sessionId: string) {
  return sessionEditorState.splitRatioBySession[sessionId] ?? 42
}

export function clearSessionEditorState(sessionId: string) {
  sessionEditorState.files = sessionEditorState.files.filter((file) => file.sessionId !== sessionId)
  delete sessionEditorState.activeFileIdBySession[sessionId]
  delete sessionEditorState.splitRatioBySession[sessionId]
}
