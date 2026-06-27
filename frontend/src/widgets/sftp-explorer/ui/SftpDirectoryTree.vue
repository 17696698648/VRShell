<template>
  <div class="sftp-directory-tree-shell">
    <UiErrorState v-if="treeError" compact :title="messages.sftp.directoryTree.errorTitle" :message="treeError" :retry-label="treeErrorPath ? messages.sftp.directoryTree.retry : ''" @retry="retryTreeError">
      <template #actions>
        <UiButton v-if="treeErrorPath" size="sm" variant="danger" @click="retryTreeError">{{ messages.sftp.directoryTree.retry }}</UiButton>
        <UiButton size="sm" variant="ghost" @click="clearTreeError">{{ messages.sftp.directoryTree.dismiss }}</UiButton>
      </template>
    </UiErrorState>
    <UiScrollArea axis="y">
      <UiTree
        class="sftp-directory-tree"
        :expanded-keys="expandedKeys"
        :get-key="(node) => node.path"
        :get-level="(node) => node.level"
        :get-parent-key="(node) => node.parentPath"
        :items="visibleNodes"
        :selected-key="selectedPath"
        label="Remote directory tree"
        @select="selectNode"
        @toggle="toggleNode"
      >
        <template #default="{item, treeItemProps}">
          <button v-bind="treeItemProps" class="sftp-directory-tree__item" type="button" :title="item.path" @contextmenu.prevent="openNodeMenu(item, $event)" @dblclick="openNode(item)" @keydown.enter.prevent="openNode(item)">
            <ChevronDown v-if="item.type === 'directory' && expandedPaths.has(item.path)" class="sftp-directory-tree__chevron" :size="14" aria-hidden="true" />
            <ChevronRight v-else-if="item.type === 'directory'" class="sftp-directory-tree__chevron" :size="14" aria-hidden="true" />
            <span v-else class="sftp-directory-tree__chevron" aria-hidden="true" />
            <Folder v-if="item.type === 'directory'" :size="16" aria-hidden="true" />
            <File v-else :size="16" aria-hidden="true" />
            <span>{{ item.name }}</span>
            <small v-if="loadingPaths.has(item.path)">{{ messages.sftp.directoryTree.loading }}</small>
          </button>
        </template>
      </UiTree>
    </UiScrollArea>
  </div>
</template>

<script setup lang="ts">
import {ChevronDown, ChevronRight, File, Folder} from '@lucide/vue'
import {computed, reactive, ref, watch} from 'vue'
import type {SessionHost} from '../../../entities/session'
import {getSftpSessionState, sftpState, type SftpItem} from '../../../entities/sftp'
import {listRemoteDirectory} from '../../../entities/sftp/api/sftpRepository'
import {createRemoteDirectory, createRemoteFile, deleteRemoteItem, downloadRemoteItem, openRemoteFileInSessionEditor, renameRemoteItem, uploadFileToRemoteDirectory, uploadFolderToRemoteDirectory} from '../../../features/sftp/manage-files/manageSftpFiles'
import {openContextMenu} from '../../../shared/context-menu'
import {messages} from '../../../shared/copy'
import {requestConfirm, requestPrompt} from '../../../shared/dialog'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'
import {UiButton, UiErrorState, UiScrollArea, UiTree} from '../../../shared/ui'

type SftpTreeNode = SftpItem & {level: number; parentPath: string | null}

const props = defineProps<{items: SftpItem[]; rootPath: string; session: SessionHost | null}>()
const emit = defineEmits<{selectDirectory: [path: string]}>()
const expandedPaths = reactive(new Set<string>())
const loadingPaths = reactive(new Set<string>())
const childrenByPath = reactive(new Map<string, SftpItem[]>())
const selectedPath = ref<string | null>(null)
const treeError = ref('')
const treeErrorPath = ref('')

const expandedKeys = computed(() => [...expandedPaths])
const visibleNodes = computed(() => buildNodes(props.rootPath, props.items, 1, null))

watch(
  () => props.session?.id ?? '',
  () => {
    restoreTreeState()
  },
  {immediate: true},
)

watch(
  () => [props.rootPath, props.items, props.session?.id] as const,
  ([rootPath, items, sessionId]) => {
    childrenByPath.set(rootPath, [...items])
    expandedPaths.add(rootPath)
    persistTreeStateForSession(sessionId ?? null)
  },
  {immediate: true},
)

async function selectNode(node: SftpTreeNode) {
  selectedPath.value = node.path
  persistTreeState()
  if (node.type === 'directory') {
    emit('selectDirectory', node.path)
    await toggleNode(node)
  }
}

async function openNode(node: SftpTreeNode) {
  selectedPath.value = node.path
  persistTreeState()
  if (node.type === 'directory') {
    emit('selectDirectory', node.path)
    await toggleNode(node)
    return
  }
  await openRemoteFileInSessionEditor(node)
}

async function toggleNode(node: SftpTreeNode) {
  if (node.type !== 'directory') return
  if (expandedPaths.has(node.path)) {
    expandedPaths.delete(node.path)
    persistTreeState()
    return
  }

  expandedPaths.add(node.path)
  persistTreeState()
  if (!childrenByPath.has(node.path)) await loadChildren(node.path)
}

async function loadChildren(path: string, options: {force?: boolean; silent?: boolean} = {}) {
  if (!props.session || loadingPaths.has(path)) return
  const session = props.session
  if (!options.force && childrenByPath.has(path)) return
  loadingPaths.add(path)
  if (!options.silent) clearTreeError()
  try {
    const children = await listRemoteDirectory(session, path)
    if (props.session?.id !== session.id) return
    childrenByPath.set(path, children)
    persistTreeStateForSession(session.id)
  } catch (error) {
    if (props.session?.id !== session.id) return
    if (!options.silent) {
      expandedPaths.delete(path)
      persistTreeStateForSession(session.id)
      treeErrorPath.value = path
      treeError.value = messages.sftp.directoryTree.expandFailed(path, getErrorMessage(error))
    }
  } finally {
    loadingPaths.delete(path)
  }
}

function clearTreeError() {
  treeError.value = ''
  treeErrorPath.value = ''
}

async function retryTreeError() {
  const path = treeErrorPath.value
  if (!path) return
  clearTreeError()
  expandedPaths.add(path)
  persistTreeState()
  await loadChildren(path, {force: true})
}

function buildNodes(parentPath: string, items: SftpItem[], level: number, parentNodePath: string | null): SftpTreeNode[] {
  return items.flatMap((item) => {
    const node = {...item, level, parentPath: parentNodePath}
    const children = item.type === 'directory' && expandedPaths.has(item.path) ? childrenByPath.get(item.path) : null
    return children ? [node, ...buildNodes(item.path, children, level + 1, item.path)] : [node]
  })
}

function openNodeMenu(node: SftpTreeNode, event: MouseEvent) {
  selectedPath.value = node.path
  persistTreeState()
  if (node.type === 'directory') emit('selectDirectory', node.path)
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: node.type === 'directory' ? directoryNodeMenu(node) : fileNodeMenu(node),
  })
}

function directoryNodeMenu(node: SftpTreeNode) {
  return [
    {id: 'open', label: messages.sftp.contextMenu.openFolder, run: () => openNode(node)},
    {id: 'mkdir', label: messages.sftp.contextMenu.newFolder, run: async () => { await createDirectoryNode(node) }},
    {id: 'create-file', label: messages.sftp.contextMenu.newFile, run: async () => { await createFileNode(node) }},
    {id: 'upload-file', label: messages.sftp.contextMenu.uploadFile, run: async () => { await uploadFileNode(node) }},
    {id: 'upload-folder', label: messages.sftp.contextMenu.uploadFolder, run: async () => { await uploadFolderNode(node) }},
    {id: 'rename', label: messages.sftp.contextMenu.rename, run: async () => { await renameNode(node) }},
    {id: 'delete', label: messages.sftp.contextMenu.delete, danger: true, run: async () => { await confirmDeleteNode(node) }},
  ]
}

function fileNodeMenu(node: SftpTreeNode) {
  return [
    {id: 'open', label: messages.sftp.contextMenu.openFile, run: () => openNode(node)},
    {id: 'download', label: messages.sftp.contextMenu.download, run: async () => { await downloadRemoteItem(node) }},
    {id: 'rename', label: messages.sftp.contextMenu.rename, run: async () => { await renameNode(node) }},
    {id: 'delete', label: messages.sftp.contextMenu.delete, danger: true, run: async () => { await confirmDeleteNode(node) }},
  ]
}

async function createDirectoryNode(node: SftpTreeNode) {
  const name = await requestPrompt({title: messages.sftp.dialogs.newRemoteFolderTitle, label: messages.sftp.dialogs.folderName, confirmLabel: messages.sftp.dialogs.create})
  if (!name) return
  const item = await createRemoteDirectory(name, node.path)
  if (item) upsertChild(node.path, item)
  scheduleSilentRefresh(node.path)
}

async function createFileNode(node: SftpTreeNode) {
  const name = await requestPrompt({title: messages.sftp.dialogs.newRemoteFileTitle, label: messages.sftp.dialogs.fileName, confirmLabel: messages.sftp.dialogs.create})
  if (!name) return
  const item = await createRemoteFile(name, node.path)
  if (item) upsertChild(node.path, item)
  scheduleSilentRefresh(node.path)
}

async function uploadFileNode(node: SftpTreeNode) {
  const item = await uploadFileToRemoteDirectory(node.path)
  if (item) upsertChild(node.path, item)
  scheduleSilentRefresh(node.path)
}

async function uploadFolderNode(node: SftpTreeNode) {
  const item = await uploadFolderToRemoteDirectory(node.path)
  if (item) upsertChild(node.path, item)
  scheduleSilentRefresh(node.path)
}

async function renameNode(node: SftpTreeNode) {
  const name = await requestPrompt({title: messages.sftp.dialogs.renameRemoteItemTitle, label: messages.sftp.dialogs.name, value: node.name, confirmLabel: messages.sftp.dialogs.rename})
  if (!name) return
  const parentPath = node.parentPath ?? props.rootPath
  const oldId = node.id
  const oldPath = node.path
  const item = await renameRemoteItem(node, name)
  if (item) {
    replaceChild(parentPath, oldId, item)
    if (item.type === 'directory') moveDirectoryCache(oldPath, item.path)
  }
  scheduleSilentRefresh(parentPath)
}

async function confirmDeleteNode(node: SftpTreeNode) {
  const confirmed = await requestConfirm({
    title: messages.sftp.dialogs.deleteTitle(node.type),
    message: messages.sftp.dialogs.deleteMessage(node.path),
    confirmLabel: messages.sftp.dialogs.delete,
    tone: 'danger',
  })
  if (!confirmed) return
  const parentPath = node.parentPath ?? props.rootPath
  await deleteRemoteItem(node)
  removeChild(parentPath, node.id)
  childrenByPath.delete(node.path)
  expandedPaths.delete(node.path)
  scheduleSilentRefresh(parentPath)
}

function upsertChild(parentPath: string, item: SftpItem) {
  const children = childrenByPath.get(parentPath) ?? []
  childrenByPath.set(parentPath, sortItems([item, ...children.filter((child) => child.id !== item.id)]))
  expandedPaths.add(parentPath)
  persistTreeState()
}

function removeChild(parentPath: string, itemId: string) {
  const children = childrenByPath.get(parentPath)
  if (!children) return
  childrenByPath.set(parentPath, children.filter((child) => child.id !== itemId))
  persistTreeState()
}

function replaceChild(parentPath: string, oldId: string, item: SftpItem) {
  const children = childrenByPath.get(parentPath)
  if (!children) return
  childrenByPath.set(parentPath, sortItems(children.map((child) => child.id === oldId ? item : child)))
  persistTreeState()
}

function moveDirectoryCache(oldPath: string, newPath: string) {
  const children = childrenByPath.get(oldPath)
  if (!children) return
  childrenByPath.delete(oldPath)
  childrenByPath.set(newPath, children.map((child) => ({...child, path: child.path.replace(`${oldPath}/`, `${newPath}/`), id: child.id.replace(`${oldPath}/`, `${newPath}/`)})))
  if (expandedPaths.delete(oldPath)) expandedPaths.add(newPath)
  persistTreeState()
}

function restoreTreeState() {
  expandedPaths.clear()
  childrenByPath.clear()
  const treeState = props.session ? getSftpSessionState(props.session.id).tree : sftpState.tree
  selectedPath.value = treeState.selectedPath
  for (const path of treeState.expandedPaths) expandedPaths.add(path)
  for (const [path, children] of Object.entries(treeState.childrenByPath)) childrenByPath.set(path, [...children])
}

function persistTreeState() {
  persistTreeStateForSession(props.session?.id ?? null)
}

function persistTreeStateForSession(sessionId: string | null) {
  const treeState = sessionId ? getSftpSessionState(sessionId).tree : sftpState.tree
  treeState.selectedPath = selectedPath.value
  treeState.expandedPaths = [...expandedPaths]
  treeState.childrenByPath = Object.fromEntries([...childrenByPath].map(([path, children]) => [path, [...children]]))
  if (sftpState.connectedSessionId === sessionId) sftpState.tree = treeState
}

function scheduleSilentRefresh(path: string) {
  void loadChildren(path, {force: true, silent: true})
}

function sortItems(items: SftpItem[]) {
  return [...items].sort((left, right) => {
    if (left.type !== right.type) return left.type === 'directory' ? -1 : 1
    return left.name.localeCompare(right.name, undefined, {numeric: true, sensitivity: 'base'})
  })
}

</script>
