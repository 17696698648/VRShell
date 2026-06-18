<template>
  <main
    class="app-shell"
    :class="['theme-' + activeTheme, { 'drawer-closed': activeDrawer === null, 'no-session': !hasActiveSession }]"
    :style="{ '--drawer-width': drawerWidth + 'px' }"
    @click="closeContextMenu(); closeWindowMenu(); hideSftpInfoPopover()"
  >
    <WindowChrome
      :menus="windowMenus"
      v-model:active-menu="activeWindowMenu"
      :active-menu-items="activeWindowMenuItems"
      :menu-open="windowMenuOpen"
      :has-active-session="hasActiveSession"
      :active-session-name="activeSession?.name ?? ''"
      :active-session-address="activeSessionAddress"
      :auto-reconnect="activeSessionAutoReconnect"
      :idle-timeout-secs="activeSessionIdleTimeoutSecs"
      :is-window-maximized="isWindowMaximized"
      @toggle-menu="toggleWindowMenu"
      @run-menu-action="runWindowMenuAction"
      @minimize="minimizeWindow"
      @toggle-maximize="toggleMaximizeWindow"
      @close="closeWindow"
    />

    <aside class="sidebar-shell" @dragenter="onSidebarDragOver" @dragover="onSidebarDragOver">
      <ActivityBar :active-drawer="activeDrawer" @toggle-drawer="toggleDrawer"/>

      <SessionDrawer
        :visible="activeDrawer === 'sessions'"
        :session-groups="sessionGroups"
        :expanded-groups="expandedGroups"
        :editing-group-id="editingGroupId"
        :dragging-group-id="draggingGroupId"
        :drag-over-group-id="dragOverGroupId"
        :drag-over-position="dragOverPosition"
        :dragging-host-name="draggingHostName"
        :drag-over-host-name="dragOverHostName"
        :host-drag-over-position="hostDragOverPosition"
        :locked-group-id="allSessionsGroupId"
        @create-root-group="createRootGroup"
        @create-session="openCreateSessionDialog(allSessionsGroupId)"
        @collapse-all-groups="collapseAllGroups"
        @toggle-group="toggleGroup"
        @open-menu="openContextMenu"
        @connect-session="connectSession"
        @rename-group="renameGroup"
        @cancel-group-rename="editingGroupId = ''"
        @group-drag-start="startGroupDrag"
        @group-drag-over="setGroupDragOver"
        @group-drag-leave="clearGroupDragOver"
        @group-drop="moveGroupByDrop"
        @group-drag-end="finishGroupDrag"
        @host-drag-start="startHostDrag"
        @host-drag-over="setHostDragOver"
        @host-drag-leave="clearHostDragOver"
        @host-drop="moveHostByDrop"
        @host-drop-to-group="moveHostToGroupEnd"
        @host-drag-end="finishHostDrag"
      />

      <SftpDrawer
        ref="sftpDrawerElementRef"
        :visible="activeDrawer === 'sftp'"
        :has-active-session="Boolean(activeSession)"
        v-model:search-text="sftpSearchText"
        :sort-key="sftpSortKey"
        :sort-direction="sftpSortDirection"
        :path="sftpPath"
        :breadcrumbs="sftpBreadcrumbs"
        :dragging="isSftpDragging"
        :virtual-nodes="virtualSftpTreeNodes"
        :visible-node-count="visibleSftpTreeNodes.length"
        :top-padding="virtualSftpTreeTopPadding"
        :bottom-padding="virtualSftpTreeBottomPadding"
        :active-file-path="activeEditorFile?.path ?? ''"
        :pending-drag-upload-directory="pendingDragUploadDirectory"
        :status="sftpStatus"
        :searching="sftpRemoteSearching"
        :result-mode="sftpSearchResultMode"
        :progress="sftpTransferProgress"
        :loading="sftpTreeLoading"
        @upload="triggerUploadToCurrentPath"
        @refresh="refreshSftpTreePath()"
        @remote-search="remoteSearchSftpTree"
        @cancel-search="cancelRemoteSearch"
        @cancel-transfer="cancelCurrentSftpTask"
        @clear-search="clearSftpSearchResults"
        @sort="setSftpSort"
        @open-path="openSftpPath"
        @drag-enter="isSftpDragging = true"
        @drag-leave="handleSftpDragLeave"
        @drop="handleSftpDrop"
        @viewport-update="updateSftpTreeViewport"
        @open="openSftpItem"
        @context-menu="openSftpContextMenu"
        @item-drag-enter="handleSftpItemDragEnter"
        @show-info="showSftpInfoPopover"
        @hide-info="hideSftpInfoPopover"
        :bookmarks="sftpBookmarks"
        @add-bookmark="addBookmark"
        @remove-bookmark="removeBookmark"
      />

      <div
        v-show="activeDrawer !== null"
        class="sidebar-resizer"
        title="Drag to resize sidebar"
        @mousedown="startResize"
      ></div>
    </aside>

    <div
      class="context-menu"
      :class="{ visible: contextMenu.visible }"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
      @contextmenu.prevent.stop
    >
      <button
        v-for="item in contextMenuItems"
        :key="contextMenu.type + ':' + item.action"
        :class="{ danger: item.danger, separated: item.separated }"
        @click="handleContextMenuAction(item.action)"
      >
        <span class="menu-icon">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </button>
    </div>

    <SftpInfoPopover
      :visible="sftpInfoPopover.visible"
      :file="sftpInfoPopover.file"
      :x="sftpInfoPopover.x"
      :y="sftpInfoPopover.y"
      @keep="keepSftpInfoPopover"
      @hide="hideSftpInfoPopover"
    />

    <CommandPalette
      :visible="paletteVisible"
      :session-names="allSessionNames"
      :group-names="allGroupNames"
      :active-theme="activeTheme"
      :theme-names="themes"
      :has-active-session="hasActiveSession"
      @close="paletteVisible = false"
      @execute="handlePaletteAction"
    />

    <div v-if="quickOpenVisible" class="modal-backdrop quick-open-backdrop" @click="closeQuickOpen">
      <div class="quick-open-dialog" @click.stop @keydown.escape="closeQuickOpen">
        <input
          ref="quickOpenInputRef"
          v-model="quickOpenQuery"
          type="text"
          placeholder="Search files in current directory..."
          @keydown.enter="quickOpenConfirm"
          @keydown.arrow-down.prevent="quickOpenNext"
          @keydown.arrow-up.prevent="quickOpenPrev"
        />
        <div class="quick-open-results" v-if="quickOpenFilteredNodes.length > 0">
          <button
            v-for="(node, index) in quickOpenFilteredNodes"
            :key="node.path"
            :class="{ selected: index === quickOpenSelectedIndex }"
            @click="quickOpenSelect(node)"
            @mouseenter="quickOpenSelectedIndex = index"
          >
            <span class="qo-icon" :style="{ color: node.icon.color }">?</span>
            <span class="qo-name">{{ node.name }}</span>
            <span class="qo-path">{{ node.path }}</span>
          </button>
        </div>
        <div v-else class="quick-open-empty">No matching files</div>
      </div>
    </div>

    <SessionDialog
      :visible="sessionDialog.visible"
      :mode="sessionDialog.mode"
      :form="sessionForm"
      :errors="sessionFormErrors"
      :testing="sessionTestLoading"
      :group-tree-select-open="groupTreeSelectOpen"
      :selected-group-name="selectedGroupName"
      :visible-group-tree-options="visibleGroupTreeOptions"
      :form-expanded-groups="formExpandedGroups"
      :normalize-display-text="normalizeDisplayText"
      @update-field="updateSessionFormField"
      @clear-error="clearSessionFormError"
      @validate-field="validateSessionField"
      @toggle-group-select="groupTreeSelectOpen = !groupTreeSelectOpen"
      @select-group="selectSessionFormGroup"
      @toggle-option-group="toggleGroupTreeSelectGroup"
      @test="testSessionConnection"
      @save="saveSession"
      @close="closeSessionDialog"
    />

    <ConfirmDialog
      :visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      @resolve="resolveConfirm"
    />

    <PromptDialog
      :visible="promptDialog.visible"
      :title="promptDialog.title"
      :message="promptDialog.message"
      :placeholder="promptDialog.placeholder"
      :input-type="promptDialog.inputType"
      :validation-error="promptDialog.validationError"
      :model-value="promptInputValue"
      @update:model-value="promptInputValue = $event"
      @confirm="resolvePromptConfirm"
      @cancel="resolvePromptCancel"
    />

    <ToastStack :toasts="toasts"/>

    <section class="workspace" :class="{ 'home-mode': !hasActiveSession }">
      <WorkspaceTabs
        :has-active-session="hasActiveSession"
        :tabs="tabs"
        @select-session="selectSessionTab"
        @close-session="closeSessionTab"
        @open-session-menu="openSessionTabContextMenu"
      />

      <div class="content-grid" :class="{ 'empty-mode': !hasActiveSession }">
        <HomeDashboard
          v-if="!hasActiveSession"
          :title="homeTitle"
          :description="homeDescription"
          :stats="homeStats"
          :opened-count="openedSessionNames.length"
          :current-theme-name="currentThemeName"
          :recent-connections="recentConnections"
          @create-session="openCreateSessionDialog(sessionGroups[0]?.id ?? '')"
          @import-config="showComingSoon('Import config')"
          @open-local-terminal="openCreateSessionDialog(sessionGroups[0]?.id ?? '')"
          @create-group="createRootGroup"
          @connect-session="connectSession"
        />

        <section
          v-else
          class="session-workbench"
          :class="{ 'editor-hidden': !showEditorArea }"
          :style="{ '--editor-height': editorPaneHeight + 'px' }"
        >
          <section v-if="showEditorArea" class="editor-pane">
            <div class="pane-tabs editor-tabs">
              <button v-for="file in editorTabs" :key="file.path" class="pane-tab editor-file-tab"
                      :class="{ selected: file.selected, dirty: file.dirty }" :title="file.path"
                      @click="selectEditorFile(file.path)" @contextmenu="openEditorTabContextMenu($event, file.path)">
                <span class="pane-tab-title">{{ file.name }}</span>
                <span v-if="file.dirty" class="dirty-dot" title="Unsaved changes"></span>
                <span class="pane-tab-close" title="Close" @click.stop="closeEditorTab(file.path)"><X
                  :size="12"/></span>
              </button>
              <select v-if="editorTabs.length > 1" class="tab-more-select" title="More editor tabs"
                      @change="handleEditorMoreSelect">
                <option value="">More ?</option>
                <option v-for="file in editorTabs" :key="'more-' + file.path" :value="file.path">
                  {{ file.dirty ? '* ' : '' }}{{ file.name }}
                </option>
              </select>

            </div>

            <div class="editor-surface">
              <CodeMirrorEditor
                v-if="activeEditorFile"
                :key="activeEditorFile.path"
                v-model="activeEditorFile.content"
                :language="activeEditorFile.language"
                :path="activeEditorFile.path"
                @update:model-value="markActiveEditorDirty"
                @save="saveActiveEditorFile"
              />
              <div v-else class="editor-empty">
                <EmptyState
                  title="No file selected"
                  description="Double-click a file in SFTP to open it here, or use the command palette to start a workflow."
                >
                  <template #icon>?</template>
                  <template #actions>
                    <UiButton title="Open command palette" v-tooltip="'Open command palette'"
                              aria-label="Open command palette" @click="openQuickOpen">Quick open
                    </UiButton>
                    <UiButton title="Show SFTP drawer" v-tooltip="'Show SFTP drawer'" aria-label="Show SFTP drawer"
                              @click="activeDrawer = 'sftp'">Show SFTP
                    </UiButton>
                  </template>
                </EmptyState>
              </div>
            </div>
          </section>

          <div
            v-if="showEditorArea"
            class="workbench-resizer"
            title="Drag to resize editor and terminal" v-tooltip="'Resize editor / terminal'"
            @mousedown="startWorkbenchResize"
          ></div>

          <section class="terminal-pane">
            <div class="pane-tabs terminal-tabs">
              <button v-for="terminal in terminalTabs" :key="terminal.id" class="pane-tab terminal-tab"
                      :class="{ selected: terminal.selected }" :title="getTerminalTabTitle(terminal)"
                      @click="selectTerminalTab(terminal.id)" @dblclick="renameTerminalTab(terminal.id)"
                      @contextmenu="openTerminalTabContextMenu($event, terminal.id)">
                <span class="terminal-status-dot" :class="'status-' + terminal.status"></span>
                <span class="pane-tab-title">{{ terminal.name }}</span>
                <span class="pane-tab-close" title="Close" @click.stop="closeTerminalTab(terminal.id)"><X
                  :size="12"/></span>
              </button>
              <select v-if="terminalTabs.length > 1" class="tab-more-select" title="More terminal tabs"
                      @change="handleTerminalMoreSelect">
                <option value="">More ?</option>
                <option v-for="terminal in terminalTabs" :key="'terminal-more-' + terminal.id" :value="terminal.id">
                  {{ terminal.name }}
                </option>
              </select>
              <button class="pane-add" title="New terminal" @click="createTerminalTab">+</button>
              <button
                v-if="hasActiveSession"
                class="pane-add broadcast-toggle"
                :class="{ active: broadcastEnabled }"
                :title="broadcastEnabled ? 'Broadcast enabled - input goes to all terminals' : 'Broadcast disabled - input goes to active terminal only'"
                @click="broadcastEnabled = !broadcastEnabled"
              >Broadcast
              </button>
            </div>

            <template v-for="sessionName in openedSessionNames" :key="sessionName">
              <TerminalComponent
                v-for="terminal in getWorkspaceState(sessionName).terminalTabs"
                :key="sessionName + '-' + terminal.id"
                :ref="(component) => setTerminalComponentRef(sessionName, terminal.id, component)"
                class="terminal-screen actual-terminal"
                :class="{ 'terminal-hidden': !(activeSession?.name === sessionName && terminal.selected) }"
                :initial-config="getTerminalConfig(sessionName)"
                :broadcast-session-ids="broadcastTargetSessionIds"
                embedded
                @connected="updateTerminalSessionId(sessionName, terminal.id, $event)"
                @status-change="(status, error) => updateTerminalStatus(sessionName, terminal.id, status, error)"
                @closed="handleTerminalClosed(sessionName, terminal.id)"
                @activity="handleTerminalActivity(sessionName, terminal.id)"
              />
            </template>
          </section>
        </section>
      </div>

    </section>

    <StatusBar
      :has-active-session="hasActiveSession"
      :active-session-address="activeSessionAddress"
      :sftp-status="sftpStatus"
      :sftp-task="sftpTask"
      :terminal-status-text="terminalStatusText"
      :editor-status-text="editorStatusText"
      :current-theme-name="currentThemeName"
    />
  </main>
</template>

<script setup lang="ts">
import {invoke} from '@tauri-apps/api/core'
import {listen} from '@tauri-apps/api/event'
import {computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {X} from '@lucide/vue'
import CodeMirrorEditor from './components/CodeMirrorEditor.vue'
import ActivityBar from './components/ActivityBar.vue'
import CommandPalette from './components/CommandPalette.vue'
import {ConfirmDialog, PromptDialog} from './components/dialog'
import {EmptyState, StatusBar, UiButton} from './components/ui'
import HomeDashboard from './components/HomeDashboard.vue'
import SessionDrawer from './components/SessionDrawer.vue'
import SessionDialog from './components/session/SessionDialog.vue'
import type {
  ContextMenuType,
  GroupDropPosition,
  HostDropPosition,
  SessionGroup,
  SessionHost
} from './components/SessionTreeGroup.vue'
import SftpDrawer from './components/sftp/SftpDrawer.vue'
import SftpInfoPopover from './components/sftp/SftpInfoPopover.vue'
import TerminalComponent from './components/TerminalComponent.vue'
import ToastStack from './components/ToastStack.vue'
import WorkspaceTabs from './components/WorkspaceTabs.vue'
import WindowChrome from './components/window/WindowChrome.vue'
import {SFTP_TREE_OVERSCAN, SFTP_TREE_ROW_HEIGHT} from './constants'
import {collapseSftpTree, createSftpTreeNode} from './composables/useSftpTree'
import {useConfirmDialog} from './composables/useConfirmDialog'
import {usePromptDialog} from './composables/usePromptDialog'
import {useContextMenu} from './composables/useContextMenu'
import {useEditorTabs} from './composables/useEditorTabs'
import {useSessionCleanup} from './composables/useSessionCleanup'
import {useSessionTreeAccess} from './composables/useSessionTreeAccess'
import {useSessionTreeDragState} from './composables/useSessionTreeDragState'
import {useSessionForm} from './composables/useSessionForm'
import {
  ALL_SESSIONS_GROUP_ID,
  ALL_SESSIONS_GROUP_NAME,
  useSessionPersistence
} from './composables/useSessionPersistence'
import {useGlobalShortcuts} from './composables/useGlobalShortcuts'
import {useHomeDashboardState} from './composables/useHomeDashboardState'
import {useQuickOpen} from './composables/useQuickOpen'
import {useResizablePane} from './composables/useResizablePane'
import {useSftpActions} from './composables/useSftpActions'
import {useSftpBookmarks} from './composables/useSftpBookmarks'
import {useSftpDropUpload} from './composables/useSftpDropUpload'
import {useSftpInfoPopover} from './composables/useSftpInfoPopover'
import {useSftpItemOpen} from './composables/useSftpItemOpen'
import {useSftpNavigation} from './composables/useSftpNavigation'
import {useSftpTask} from './composables/useSftpTask'
import {useSftpTreeLoader} from './composables/useSftpTreeLoader'
import {useSftpViewState} from './composables/useSftpViewState'
import {copyText, useTerminalCommands} from './composables/useTerminalCommands'
import {useTerminalActivity} from './composables/useTerminalActivity'
import {useTerminalRegistry} from './composables/useTerminalRegistry'
import {useTerminalViewState} from './composables/useTerminalViewState'
import {useThemeState, type ThemeName} from './composables/useThemeState'
import {useToasts} from './composables/useToasts'
import {useUiStatePersistence} from './composables/useUiStatePersistence'
import {useWindowControls} from './composables/useWindowControls'
import {useWindowMenuState} from './composables/useWindowMenuState'
import {
  addTerminalTab,
  applyTerminalTabAction as dispatchTerminalTabAction,
  closeTerminalTab as closeTerminalTabState,
  createTerminalTabState as createTerminalTabModel,
  getTerminalTabTitle,
  renameTerminalTab as renameTerminalTabState,
  selectTerminalTab as selectTerminalTabState,
  updateTerminalSessionId as updateTerminalTabSessionId,
  updateTerminalStatus as updateTerminalTabStatus,
} from './composables/useTerminalTabs'
import {resetWorkspaceState, useWorkspaceStore} from './composables/useWorkspaceStore'
import type {ContextMenuScope} from './menuTypes'
import {
  disconnectSftpConnection,
  type SftpConnection,
} from './services/sftp'
import type {
  EditorFile,
  SftpFileItem,
  SftpSortKey,
  SftpTreeNode,
  TerminalStatus,
  TerminalTab,
} from './types'
import {getContextMenuItems, type ContextMenuItem} from './utils/contextMenuItems'
import {applyContextMenuAction} from './utils/contextMenuActions'
import {fileToBase64 as readFileAsBase64} from './utils/fileTransfer'
import {createId} from './utils/id'
import {applyPaletteAction} from './utils/paletteActions'
import {
  appendNewSessionGroup,
  createSessionGroup,
  ensureRootSessionGroup,
  isLockedSessionGroup,
  renameSessionGroup,
} from './utils/sessionGroupCreate'
import {
  activateNextSessionAfterRemoval,
  closeOpenedSessionTabs,
  ensureSessionOpened,
  getLastOpenedSession,
  removeOpenedSession,
  removeSessionHost,
  setActiveSessionHost,
} from './utils/sessionLifecycle'
import {applySessionTabAction as dispatchSessionTabAction} from './utils/sessionTabActions'
import {
  moveGroupByDrop as moveSessionGroupByDrop,
  moveHostByDrop as moveSessionHostByDrop,
  moveHostToGroupEnd as moveSessionHostToGroupEnd,
} from './utils/sessionTreeMove'
import {applySessionTreeAction as dispatchSessionTreeAction} from './utils/sessionTreeActions'
import {buildTerminalConfig} from './utils/terminalConfig'
import {runWindowMenuAction as dispatchWindowMenuAction} from './utils/windowMenuActions'
import type {WindowMenuAction} from './windowMenus'

type DrawerName = 'sessions' | 'sftp'

const activityBarWidth = 48
const minDrawerWidth = 280
const maxDrawerWidth = 420

const {
  isWindowMaximized,
  minimizeWindow,
  toggleMaximizeWindow,
  closeWindow,
} = useWindowControls()
const {
  activeWindowMenu,
  activeWindowMenuItems,
  closeWindowMenu,
  toggleWindowMenu,
  windowMenuOpen,
  windowMenus,
} = useWindowMenuState()
const activeDrawer = ref<DrawerName | null>('sessions')
const paletteVisible = ref(false)
const hasActiveSession = ref(false)
const openedSessionNames = ref<string[]>([])
const broadcastEnabled = ref(false)
const autoReconnectEnabled = ref(false)
const {activeTheme, currentThemeName, themes} = useThemeState()
const {size: drawerWidth, startResize} = useResizablePane({
  initialSize: minDrawerWidth,
  minSize: minDrawerWidth,
  maxSize: maxDrawerWidth,
  axis: 'x',
  onResize: () => scheduleActiveTerminalFit(),
})
const showEditorArea = computed({
  get: () => activeWorkspace.value.showEditorArea,
  set: (value) => (activeWorkspace.value.showEditorArea = value)
})
const editorPaneHeight = computed({
  get: () => activeWorkspace.value.editorPaneHeight,
  set: (value) => (activeWorkspace.value.editorPaneHeight = value)
})
const {startResize: startWorkbenchResize} = useResizablePane({
  initialSize: 230,
  minSize: 120,
  maxSize: 420,
  axis: 'y',
  sizeRef: editorPaneHeight,
  onResize: () => scheduleActiveTerminalFit(),
})
const editingGroupId = ref('')
const allSessionsGroupId = ALL_SESSIONS_GROUP_ID
const {
  clearGroupDragOver,
  clearHostDragOver,
  dragOverGroupId,
  dragOverHostName,
  dragOverPosition,
  draggingGroupId,
  draggingHostName,
  finishGroupDrag,
  finishHostDrag,
  hostDragOverPosition,
  preventSidebarDragDefault: onSidebarDragOver,
  setGroupDragOver,
  setHostDragOver,
  startGroupDrag,
  startHostDrag,
} = useSessionTreeDragState(isAllSessionsGroup)

const {
  contextMenu,
  openContextMenu,
  openContextMenuAt,
  openEditorTabContextMenu,
  openSessionTabContextMenu,
  openTerminalTabContextMenu,
  openSftpContextMenu,
  closeContextMenu,
} = useContextMenu()
const {
  sftpInfoPopover,
  showSftpInfoPopover,
  keepSftpInfoPopover,
  hideSftpInfoPopover,
} = useSftpInfoPopover()
const {
  confirmDialog,
  askConfirm,
  resolveConfirm,
  closeConfirmDialog,
} = useConfirmDialog()
const {
  promptDialog,
  inputValue: promptInputValue,
  askPrompt,
  confirmPrompt: resolvePromptConfirm,
  cancelPrompt: resolvePromptCancel,
  closePromptDialog,
} = usePromptDialog()
const {
  toasts,
  showToast,
  showComingSoon,
} = useToasts(createId)

const contextMenuItems = computed<ContextMenuItem[]>(() => getContextMenuItems(
  contextMenu.type,
  contextMenu.type === 'group' && isAllSessionsGroup(contextMenu.targetId),
))

function runWindowMenuAction(action: WindowMenuAction) {
  dispatchWindowMenuAction(action, {
    closeWindowMenu,
    openCreateSessionDialog: () => openCreateSessionDialog(sessionGroups[0]?.id ?? ''),
    closeActiveSession: () => {
      if (activeSession.value) {
        closeSessionTab(activeSession.value.name)
      }
    },
    toggleSessionsDrawer: () => toggleDrawer('sessions'),
    openSftpDrawer: (mode) => {
      activeDrawer.value = 'sftp'
      if (activeSession.value) {
        mode === 'refresh' ? refreshSftpTreePath() : loadSftpTreeRoot()
      }
    },
    collapseAllGroups,
    testSessionConnection,
    showAbout: () => showToast('VRShell'),
  })
}

const {
  sftpBookmarks,
  loadBookmarks,
  addBookmark,
  removeBookmark,
} = useSftpBookmarks(showToast)

const {sessionGroups, expandedGroups, loadPersistedSessionTree, persistSessionTree} = useSessionPersistence()
const {
  countGroups,
  countHosts,
  createGroupId,
  createUniqueGroupName,
  createUniqueHostName,
  findActiveHost,
  findFirstHost,
  findGroup,
  findGroupInList,
  findGroupListLocation,
  findGroupPath,
  findHost,
  findHostListLocation,
  findHostLocation,
  flattenHosts,
  hasActiveHost,
  removeGroupFromList,
  walkGroups,
} = useSessionTreeAccess(sessionGroups)
const {
  homeDescription,
  homeStats,
  homeTitle,
  recentConnections,
} = useHomeDashboardState({
  sessionGroups,
  countGroups,
  countHosts,
  flattenHosts,
})
const {
  sessionDialog,
  sessionForm,
  sessionFormErrors,
  sessionTestLoading,
  groupTreeSelectOpen,
  formExpandedGroups,
  validateSessionField,
  validateRequiredSessionFields,
  clearSessionFormError,
  updateSessionFormField,
  resetSessionForm,
  closeSessionDialog,
  prepareCreateSession,
  prepareEditSession,
  buildSessionHost,
} = useSessionForm(() => sessionGroups[0]?.id ?? '')

const selectedGroupName = computed(() => normalizeDisplayText(findGroup(sessionForm.groupId)?.name ?? 'Select group'))
const visibleGroupTreeOptions = computed(() => flattenVisibleFormGroups(sessionGroups))
const sessionTreeSummary = computed(() => {
  const hostCount = sessionGroups.reduce((total, group) => total + countHosts(group), 0)
  const groupCount = countGroups(sessionGroups)
  return `${hostCount} sessions - ${groupCount} groups`
})
const activeSession = computed(() => findActiveHost())
const activeTerminalConfig = computed(() => buildTerminalConfig(activeSession.value))
const {
  workspaceStates,
  activeWorkspace,
  getWorkspaceState,
  deleteWorkspaceState
} = useWorkspaceStore(() => activeSession.value?.name)
const terminalTabs = computed(() => (hasActiveSession.value ? activeWorkspace.value.terminalTabs : []))
const pendingUploadDirectory = ref('/')
const sftpDrawerElementRef = ref<HTMLElement | { $el?: HTMLElement } | null>(null)
const sftpRemoteSearching = ref(false)
const sftpCancelRemoteSearch = ref(false)
const sftpSearchResultMode = ref(false)
const {
  currentTask: sftpTask,
  progressView: sftpTransferProgress,
  beginTask: beginSftpTask,
  applyProgress: applySftpTaskProgress,
  finishTask: finishSftpTask,
  failTask: failSftpTask,
  cancelCurrentTask: cancelCurrentSftpTask,
} = useSftpTask(getSftpConnection, (message) => {
  sftpStatus.value = message
})
const sftpPath = computed({
  get: () => activeWorkspace.value.sftpPath,
  set: (value) => (activeWorkspace.value.sftpPath = value)
})
const sftpFiles = computed({
  get: () => activeWorkspace.value.sftpFiles,
  set: (value) => (activeWorkspace.value.sftpFiles = value)
})
const sftpTree = computed({
  get: () => activeWorkspace.value.sftpTree,
  set: (value) => (activeWorkspace.value.sftpTree = value)
})
const sftpSearchText = computed({
  get: () => activeWorkspace.value.sftpSearchText,
  set: (value) => (activeWorkspace.value.sftpSearchText = value)
})
const sftpStatus = computed({
  get: () => activeWorkspace.value.sftpStatus,
  set: (value) => (activeWorkspace.value.sftpStatus = value)
})
const {
  navigateSftpBack,
  navigateSftpForward,
  pushSftpPath,
} = useSftpNavigation(openSftpPath)
const sftpSortKey = computed({
  get: () => activeWorkspace.value.sftpSortKey,
  set: (value) => (activeWorkspace.value.sftpSortKey = value)
})
const sftpSortDirection = computed({
  get: () => activeWorkspace.value.sftpSortDirection,
  set: (value) => (activeWorkspace.value.sftpSortDirection = value)
})
const editorTabs = computed({
  get: () => activeWorkspace.value.editorTabs,
  set: (value) => (activeWorkspace.value.editorTabs = value)
})
const activeEditorFile = computed(() => editorTabs.value.find((file) => file.selected) ?? null)

function handleEditorMoreSelect(event: Event) {
  const nextPath = (event.target as HTMLSelectElement).value
  if (nextPath) selectEditorFile(nextPath)
  ;
  (event.target as HTMLSelectElement).value = ''
}

function handleTerminalMoreSelect(event: Event) {
  const nextTerminalId = (event.target as HTMLSelectElement).value
  if (nextTerminalId) selectTerminalTab(nextTerminalId)
  ;
  (event.target as HTMLSelectElement).value = ''
}

const {
  selectEditorFile,
  openSftpFile,
  closeEditorTab,
  markActiveEditorDirty,
  applyEditorTabAction,
  saveAllEditorFiles,
  saveEditorFile,
  saveActiveEditorFile,
} = useEditorTabs({
  editorTabs,
  activeEditorFile,
  showEditorArea,
  sftpFiles,
  sftpStatus,
  hasActiveSession: () => Boolean(activeSession.value),
  getSftpConnection,
  findSftpTreeNode,
  askConfirm,
  showToast,
  beginSftpTask,
  finishSftpTask,
  failSftpTask,
  refreshSftpTreePath,
})
const {
  findSftpTreeNode: findSftpTreeNodeState,
  loadSftpFiles,
  loadSftpTreeRoot,
  openSftpPath: openSftpPathState,
  refreshSftpTreePath: refreshSftpTreePathState,
  sftpTreeLoading,
  toggleSftpTreeNode,
} = useSftpTreeLoader({
  sftpPath,
  sftpFiles,
  sftpTree,
  sftpStatus,
  hasActiveSession: () => Boolean(activeSession.value),
  getSftpConnection,
  openSftpFile,
  pushSftpPath,
})
const {
  setSftpSort,
  sftpBreadcrumbs,
  sftpSortLabel,
  sftpTreeScrollTop,
  sftpTreeViewportHeight,
  sortedFlattenedTree,
  updateSftpTreeViewport,
  visibleSftpTreeNodes,
  virtualSftpTreeBottomPadding,
  virtualSftpTreeNodes,
  virtualSftpTreeTopPadding,
} = useSftpViewState({
  sftpTree,
  sftpPath,
  sftpSearchText,
  sftpSortKey,
  sftpSortDirection,
  rowHeight: SFTP_TREE_ROW_HEIGHT,
  overscan: SFTP_TREE_OVERSCAN,
})
const {
  quickOpenVisible,
  quickOpenQuery,
  quickOpenInputRef,
  quickOpenSelectedIndex,
  quickOpenFilteredNodes,
  openQuickOpen,
  closeQuickOpen,
  quickOpenNext,
  quickOpenPrev,
  quickOpenConfirm,
  quickOpenSelect,
} = useQuickOpen(sortedFlattenedTree, (node) => {
  if (node.isDirectory) {
    toggleSftpTreeNode(node)
  } else {
    openSftpFile(node)
  }
})
const {
  remoteSearchSftpTree,
  cancelRemoteSearch,
  clearSftpSearchResults,
  triggerUploadToCurrentPath,
  applySftpAction,
  uploadLocalPaths,
  uploadLocalFiles,
} = useSftpActions({
  state: {
    sftpSearchText,
    sftpStatus,
    sftpRemoteSearching,
    sftpCancelRemoteSearch,
    sftpSearchResultMode,
    sftpTreeScrollTop,
    sftpPath,
    sftpFiles,
    sftpTree,
    pendingUploadDirectory,
    editorTabs,
  },
  tree: {
    loadSftpTreeRoot,
    loadSftpFiles,
    createSftpTreeNode,
    findSftpTreeNode,
    refreshSftpTreePath,
    collapseSftpTree,
  },
  io: {
    getSftpConnection,
    openSftpFile,
    copyText,
    readFileAsBase64,
  },
  feedback: {
    askConfirm,
    askPrompt,
    showToast,
  },
  task: {
    beginSftpTask,
    finishSftpTask,
    failSftpTask,
  },
})
const {
  isSftpDragging,
  pendingDragUploadDirectory,
  registerTauriDragDrop,
  handleSftpDragLeave,
  handleSftpItemDragEnter,
  handleSftpDrop,
} = useSftpDropUpload(sftpDrawerElementRef, sftpPath, uploadLocalPaths, uploadLocalFiles)
const sftpConnected = computed(() => activeDrawer.value === 'sftp' && Boolean(activeSession.value))
const {
  openSftpDirectory,
  openSftpItem,
} = useSftpItemOpen({
  sftpPath,
  visibleSftpTreeNodes,
  findSftpTreeNode,
  openSftpFile,
  openSftpPath,
  toggleSftpTreeNode,
})
const activeSessionAddress = computed(() => (activeSession.value ? `${activeSession.value.address}:${activeSession.value.port}` : ''))
const activeSessionAutoReconnect = computed(() => activeSession.value?.autoReconnect ?? false)
const activeSessionIdleTimeoutSecs = computed(() => activeSession.value?.idleTimeoutSecs ?? 0)
const {
  activeTerminalTab,
  broadcastTargetSessionIds,
  terminalStatusText,
} = useTerminalViewState({
  terminalTabs,
  broadcastEnabled,
  activeSession,
})
const {
  setTerminalComponentRef,
  getSessionTerminalRefs,
  getTerminalRef,
  scheduleActiveTerminalFit,
  disconnectTerminalRef,
  reconnectTerminalRef,
  removeSessionTerminalRefs,
} = useTerminalRegistry(
  () => activeSession.value?.name,
  () => activeTerminalTab.value?.id,
)
const {
  hasDirtyEditors,
  resetHostRuntimeState,
  cleanupClosedSession,
  disconnectAllSessionsBeforeExit,
} = useSessionCleanup({
  openedSessionNames,
  workspaceStates,
  getSessionTerminalRefs,
  removeSessionTerminalRefs,
  disconnectSftpSession,
  findHost,
  deleteWorkspaceState,
})
const {
  copySshCommand,
  openInTerminal,
} = useTerminalCommands({
  getActiveSession: () => activeSession.value,
  getActiveTerminal: () => activeTerminalTab.value,
  getTerminalRef,
  showToast,
})
const {
  clearTabActivity,
  markTerminalActivity,
  tabActivitySet,
} = useTerminalActivity(() => activeTerminalTab.value?.id)
const editorStatusText = computed(() => {
  if (!activeEditorFile.value) {
    return ''
  }

  return `${activeEditorFile.value.dirty ? 'Unsaved' : 'Saved'} - ${activeEditorFile.value.name}`
})

const allSessionNames = computed(() => flattenHosts(sessionGroups).map((host) => host.name))
const allGroupNames = computed(() => {
  const names: string[] = []
  walkGroups((group) => names.push(group.name))
  return names
})

function handlePaletteAction(action: string, payload?: string) {
  // SSH settings — handled directly since they call invoke
  if (action === 'ssh_hash_known_hosts') {
    invoke<boolean>('get_hash_known_hosts').then((enabled) => {
      invoke('set_hash_known_hosts', {enabled: !enabled}).then(() => {
        showToast(`主机名哈希已${!enabled ? '开启' : '关闭'}`, 'success')
      })
    })
    return
  }
  if (action === 'ssh_auto_reconnect') {
    // Toggle a stored frontend preference (default false)
    autoReconnectEnabled.value = !autoReconnectEnabled.value
    showToast(`自动重连已${autoReconnectEnabled.value ? '开启' : '关闭'}`, 'success')
    return
  }

  applyPaletteAction({
    action,
    payload,
    openCreateSessionDialog: () => openCreateSessionDialog(sessionGroups[0]?.id ?? ''),
    closeActiveSession: () => {
      if (activeSession.value) {
        closeSessionTab(activeSession.value.name)
      }
    },
    toggleSessions: () => toggleDrawer('sessions'),
    openSftp: (mode) => {
      activeDrawer.value = 'sftp'
      if (activeSession.value) {
        mode === 'refresh' ? refreshSftpTreePath() : ensureActiveSftpLoaded()
      }
    },
    collapseAllGroups,
    connectSession,
    switchTheme: (themeName) => (activeTheme.value = themeName as ThemeName),
  })
}

useGlobalShortcuts({
  togglePalette: () => {
    paletteVisible.value = !paletteVisible.value
  },
  openQuickOpen,
  navigateSftpBack,
  navigateSftpForward,
  closeQuickOpen,
  closePalette: () => {
    if (!paletteVisible.value) return false
    paletteVisible.value = false
    return true
  },
  closeWindowMenu: () => {
    if (!windowMenuOpen.value) return false
    closeWindowMenu()
    return true
  },
  closeContextMenu: () => {
    if (!contextMenu.visible) return false
    closeContextMenu()
    return true
  },
  closeConfirmDialog,
  isSftpActive: () => activeDrawer.value === 'sftp',
})

const {restoreUiState} = useUiStatePersistence({
  activeTheme,
  showEditorArea,
  editorPaneHeight,
  drawerWidth,
  activeDrawer,
  minDrawerWidth,
  maxDrawerWidth,
})

onMounted(async () => {
  restoreUiState()
  loadBookmarks()
  loadPersistedSessionTree()
  registerTauriDragDrop()
  registerSftpProgressListener()
  window.addEventListener('beforeunload', disconnectAllSessionsBeforeExit)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', disconnectAllSessionsBeforeExit)
  disconnectAllSessionsBeforeExit()
})

async function registerSftpProgressListener() {
  try {
    await listen('sftp-progress', (event) => {
      applySftpTaskProgress(event.payload as Parameters<typeof applySftpTaskProgress>[0])
    })
  } catch (error) {
    console.warn('register sftp progress failed:', error)
  }
}


function toggleDrawer(drawerName: DrawerName) {
  activeDrawer.value = activeDrawer.value === drawerName ? null : drawerName

  if (drawerName === 'sftp' && activeDrawer.value === 'sftp') {
    ensureActiveSftpLoaded()
  }
}


async function ensureActiveSftpLoaded() {
  if (!activeSession.value) {
    sftpFiles.value = []
    sftpStatus.value = 'Please connect a session first'
    return
  }

  if (sftpTree.value.length === 0 && !sftpTreeLoading.value) {
    await loadSftpTreeRoot()
    return
  }

  if (sftpFiles.value.length === 0 && sftpTree.value.length > 0) {
    sftpPath.value = '/'
    sftpFiles.value = sftpTree.value
  }
}

function findSftpTreeNode(path: string, nodes?: SftpTreeNode[]) {
  return findSftpTreeNodeState(path, nodes)
}

function refreshSftpTreePath(path = sftpPath.value) {
  return refreshSftpTreePathState(path)
}

function openSftpPath(path: string, options: { recordHistory?: boolean } = {}) {
  return openSftpPathState(path, options)
}


function resetWorkbenchState() {
  resetWorkspaceState(activeWorkspace.value)
}

function createTerminalTab() {
  addTerminalTab(activeWorkspace.value.terminalTabs, () => createId('terminal'))
}

function createTerminalTabState(name: string, selected = false): TerminalTab {
  return createTerminalTabModel(createId('terminal'), name, selected)
}

function selectTerminalTab(terminalId: string) {
  selectTerminalTabState(activeWorkspace.value.terminalTabs, terminalId)
  scheduleActiveTerminalFit(terminalId)
}

function renameTerminalTab(terminalId: string) {
  const terminal = activeWorkspace.value.terminalTabs.find((item) => item.id === terminalId)
  const nextName = window.prompt('Enter terminal name', terminal?.name ?? '')?.trim()

  if (nextName) {
    renameTerminalTabState(activeWorkspace.value.terminalTabs, terminalId, nextName)
  }
}

function handleTerminalActivity(_sessionName: string, terminalId: string) {
  markTerminalActivity(terminalId)
}

function handleTerminalClosed(sessionName: string, terminalId: string) {
  updateTerminalStatus(sessionName, terminalId, 'disconnected')
  clearTabActivity(terminalId)
}

function updateTerminalSessionId(sessionName: string, terminalId: string, sessionId: string) {
  updateTerminalTabSessionId(getWorkspaceState(sessionName).terminalTabs, terminalId, sessionId)
}

function updateTerminalStatus(sessionName: string, terminalId: string, status: TerminalStatus, error = '') {
  updateTerminalTabStatus(getWorkspaceState(sessionName).terminalTabs, terminalId, status, error)

  // Sync session host status
  const host = findHost(sessionName)
  if (host) {
    if (status === 'connected') {
      host.status = 'connected'
      // Measure latency in background
      measureHostLatency(host)
    } else if (status === 'error') host.status = 'error'
    else if (status === 'connecting' || status === 'reconnecting') host.status = 'connecting'
    else if (status === 'disconnected') host.status = 'idle'
  }
}

async function measureHostLatency(host: SessionHost) {
  try {
    const ms = await invoke<number>('tcp_latency', {host: host.address, port: host.port})
    host.latency = `${ms}ms`
  } catch {
    host.latency = '-'
  }
}

function getTerminalConfig(sessionName: string) {
  return buildTerminalConfig(findHost(sessionName))
}

function closeTerminalTab(terminalId: string, sessionName = activeSession.value?.name) {
  if (!sessionName) {
    return
  }

  const workspace = getWorkspaceState(sessionName)

  if (!workspace.terminalTabs.some((terminal) => terminal.id === terminalId)) {
    return
  }

  disconnectTerminalRef(sessionName, terminalId)
  closeTerminalTabState(workspace.terminalTabs, terminalId, () => createId('terminal'))
}

function applyTerminalTabAction(terminalId: string, action: string) {
  dispatchTerminalTabAction({
    terminals: activeWorkspace.value.terminalTabs,
    terminalId,
    action,
    createId: () => createId('terminal'),
    reconnectTerminal: (id) => {
      if (activeSession.value) {
        reconnectTerminalRef(activeSession.value.name, id)
      }
    },
    copySshCommand,
    closeTerminalTab,
    selectTerminalTab,
  })
}

async function handleContextMenuAction(action: string) {
  const targetType = contextMenu.type
  const targetId = contextMenu.targetId

  try {
    await applyContextMenuAction({
      targetType,
      targetId,
      action,
      handlers: {
        applyEditorTabAction,
        applySessionTabAction,
        applyTerminalTabAction,
        applySftpAction,
        openInTerminal,
        applySessionTreeAction,
      },
    })
  } catch (error) {
    console.error('context menu action failed:', error)
  } finally {
    closeContextMenu()
  }
}

function getSftpConnection(): SftpConnection {
  return {
    host: activeSession.value?.address ?? '',
    port: activeSession.value?.port ?? 22,
    username: activeSession.value?.user ?? '',
    password: activeSession.value?.authMethod === 'password' ? activeSession.value.password : null,
    privateKeyPath: activeSession.value?.authMethod === 'key' ? activeSession.value.privateKeyPath ?? null : null,
    passphrase: activeSession.value?.authMethod === 'key' ? activeSession.value.passphrase ?? null : null,
  }
}

function applySessionTreeAction(targetType: ContextMenuType, targetId: string, action: string) {
  dispatchSessionTreeAction({
    targetType,
    targetId,
    action,
    isLockedGroup: isAllSessionsGroup,
    resolveContextGroupId,
    createChildGroup,
    openCreateSessionDialog,
    startGroupRename,
    deleteGroup,
    connectSession,
    openEditSessionDialog,
    deleteSession,
  })
}

function createRootGroup() {
  const rootGroup = ensureAllSessionsGroup()
  const newGroup = appendNewSessionGroup({
    parentGroup: rootGroup,
    expandedGroups,
    createGroup: buildNewGroup,
  })
  editingGroupId.value = newGroup.id
}

function createChildGroup(parentGroupId: string) {
  const parentGroup = findGroup(parentGroupId)

  if (!parentGroup) {
    return
  }

  const newGroup = appendNewSessionGroup({
    parentGroup,
    expandedGroups,
    createGroup: buildNewGroup,
  })
  editingGroupId.value = newGroup.id
}

function openCreateSessionDialog(groupId: string) {
  prepareCreateSession(groupId)
  resetFormGroupTreeExpansion(sessionForm.groupId)
}

function resolveContextGroupId(targetType: ContextMenuType, targetId: string) {
  if (targetType === 'group') {
    return findGroup(targetId)?.id ?? sessionGroups[0]?.id ?? ''
  }

  const hostLocation = findHostLocation(targetId)
  return hostLocation?.group.id ?? sessionGroups[0]?.id ?? ''
}

function openEditSessionDialog(hostName: string) {
  const hostLocation = findHostLocation(hostName)

  if (!hostLocation) {
    return
  }

  prepareEditSession(hostLocation.host, hostLocation.group, resolveContextGroupId('session', hostName))
  resetFormGroupTreeExpansion(sessionForm.groupId)
}

async function testSessionConnection() {
  sessionTestLoading.value = true
  try {
    if (!validateRequiredSessionFields()) return

    // Use real SSH connection test
    const latency = await invoke<number>('test_ssh_connection', {
      host: sessionForm.address,
      port: sessionForm.port,
      username: sessionForm.user,
      password: sessionForm.authMethod === 'password' ? sessionForm.password || null : null,
      privateKeyPath: sessionForm.authMethod === 'key' ? sessionForm.privateKeyPath || null : null,
      passphrase: sessionForm.authMethod === 'key' ? sessionForm.passphrase || null : null,
    })
    showToast(`Connection successful (${latency}ms)`, 'success')
  } catch {
    showToast('Connection failed', 'error')
  } finally {
    sessionTestLoading.value = false
  }
}

function saveSession() {
  const targetGroup = findGroup(sessionForm.groupId)

  if (!targetGroup) {
    return
  }

  if (sessionDialog.mode === 'edit') {
    deleteSession(sessionDialog.originalName)
  }

  const newSession = buildSessionHost(createUniqueHostName(sessionForm.name || 'new-session', sessionDialog.originalName))

  targetGroup.hosts.push(newSession)
  expandedGroups[targetGroup.id] = true
  closeSessionDialog()
}

function connectSession(hostName: string) {
  const host = findHost(hostName)

  if (!host) {
    return
  }

  ensureSessionOpened(openedSessionNames.value, host.name)

  getWorkspaceState(host.name)
  setActiveHost(host.name)
  hasActiveSession.value = true

  if (activeDrawer.value === 'sftp') {
    ensureActiveSftpLoaded()
  }
}

function selectSessionTab(hostName: string) {
  if (!openedSessionNames.value.includes(hostName)) {
    connectSession(hostName)
    return
  }

  setActiveHost(hostName)
  hasActiveSession.value = true
  scheduleActiveTerminalFit()

  if (activeDrawer.value === 'sftp') {
    ensureActiveSftpLoaded()
  }
}

async function applySessionTabAction(hostName: string, action: string) {
  await dispatchSessionTabAction({
    hostName,
    action,
    openedSessionNames: openedSessionNames.value,
    closeSessionTabs,
    closeSessionTab,
    selectSessionTab,
  })
}

async function closeSessionTabs(hostNames: string[]) {
  await closeOpenedSessionTabs({
    hostNames,
    openedSessionNames: openedSessionNames.value,
    closeSessionTab,
  })
}

async function closeSessionTab(hostName: string) {
  if (hasDirtyEditors(hostName)) {
    const confirmed = await askConfirm('Close session', hostName + ' has unsaved files. Confirm to save and close, or cancel to keep it open.')
    if (!confirmed) {
      return
    }
    // Auto-save all dirty files before closing
    await saveAllEditorFiles()
  }

  await cleanupClosedSession(hostName)

  const nextSessionName = getLastOpenedSession(openedSessionNames.value)
  if (nextSessionName) {
    setActiveHost(nextSessionName)
    hasActiveSession.value = true
  } else {
    hasActiveSession.value = false
  }
}

async function disconnectSftpSession(hostName: string) {
  const host = findHost(hostName)
  if (!host) {
    return
  }

  try {
    await disconnectSftpConnection({
      host: host.address,
      port: host.port,
      username: host.user,
    })
  } catch (error) {
    console.warn('disconnect sftp session failed:', error)
  }
}

function deleteGroup(groupId: string) {
  if (isAllSessionsGroup(groupId)) {
    return
  }

  const group = findGroup(groupId)
  const removedActiveSession = group ? hasActiveHost(group) : false

  if (removeGroupFromList(sessionGroups, groupId)) {
    removeExpandedState(group)

    activateNextSessionAfterRemoval({
      shouldUpdate: removedActiveSession,
      findFirstHostName: () => findFirstHost()?.name,
      connectSession,
      setHasActiveSession: (value) => (hasActiveSession.value = value),
    })
  }
}

function deleteSession(hostName: string, updateActiveState = true) {
  const removedActiveSession = removeSessionHost(sessionGroups, hostName)
  openedSessionNames.value = removeOpenedSession(openedSessionNames.value, hostName)

  activateNextSessionAfterRemoval({
    shouldUpdate: removedActiveSession && updateActiveState,
    findFirstHostName: () => findFirstHost()?.name,
    connectSession,
    setHasActiveSession: (value) => (hasActiveSession.value = value),
  })
}

function startGroupRename(groupId: string) {
  if (isAllSessionsGroup(groupId)) {
    return
  }

  editingGroupId.value = groupId
}

function renameGroup(payload: { groupId: string; name: string }) {
  renameSessionGroup({
    groupId: payload.groupId,
    name: payload.name,
    lockedGroupId: ALL_SESSIONS_GROUP_ID,
    findGroup,
  })
  editingGroupId.value = ''
}

function moveGroupByDrop(sourceGroupId: string, targetGroupId: string, position: GroupDropPosition) {
  moveSessionGroupByDrop({
    sourceGroupId,
    targetGroupId,
    position,
    isLockedGroup: isAllSessionsGroup,
    isDescendantGroup,
    findGroup,
    findGroupListLocation,
    expandedGroups,
    persistSessionTree,
  })
  finishGroupDrag()
}

function moveHostByDrop(sourceHostName: string, targetHostName: string, position: HostDropPosition) {
  moveSessionHostByDrop({
    sourceHostName,
    targetHostName,
    position,
    findHostListLocation,
    persistSessionTree,
  })
  finishHostDrag()
}

function moveHostToGroupEnd(sourceHostName: string, targetGroupId: string) {
  moveSessionHostToGroupEnd({
    sourceHostName,
    targetGroupId,
    findHostListLocation,
    findGroup,
    expandedGroups,
    persistSessionTree,
  })
  finishHostDrag()
}

function setActiveHost(hostName: string) {
  setActiveSessionHost(sessionGroups, hostName)
}

function buildNewGroup(siblingGroups: SessionGroup[], baseName: string): SessionGroup {
  return createSessionGroup({
    siblingGroups,
    baseName,
    createUniqueGroupName,
    createGroupId,
  })
}

function isAllSessionsGroup(groupId: string) {
  return isLockedSessionGroup(groupId, ALL_SESSIONS_GROUP_ID)
}

function ensureAllSessionsGroup() {
  return ensureRootSessionGroup({
    sessionGroups,
    rootGroupId: ALL_SESSIONS_GROUP_ID,
    rootGroupName: ALL_SESSIONS_GROUP_NAME,
  })
}

function isDescendantGroup(parentGroupId: string, childGroupId: string) {
  const parentGroup = findGroup(parentGroupId)

  if (!parentGroup) {
    return false
  }

  return Boolean(findGroupInList(childGroupId, parentGroup.children))
}

function removeExpandedState(group?: SessionGroup) {
  if (!group) {
    return
  }

  delete expandedGroups[group.id]
  group.children.forEach(removeExpandedState)
}

function normalizeDisplayText(value: string) {
  const replacements: Record<string, string> = {
    'All': 'All',
    'New Group': 'New Group',
    'Terminal 1': 'Terminal 1',
  }
  return replacements[value] ?? value
}

function toggleGroup(groupId: string) {
  expandedGroups[groupId] = !expandedGroups[groupId]
}

function toggleGroupTreeSelectGroup(event: MouseEvent, group: SessionGroup) {
  event.stopPropagation()
  if (group.children.length === 0) {
    return
  }

  formExpandedGroups[group.id] = !formExpandedGroups[group.id]
}

function selectSessionFormGroup(groupId: string) {
  sessionForm.groupId = groupId
  resetFormGroupTreeExpansion(groupId)
  groupTreeSelectOpen.value = false
}

function flattenVisibleFormGroups(groups: SessionGroup[], depth = 0): Array<{ group: SessionGroup; depth: number }> {
  return groups.flatMap((group) => {
    const current = {group, depth}
    return formExpandedGroups[group.id]
      ? [current, ...flattenVisibleFormGroups(group.children, depth + 1)]
      : [current]
  })
}

function resetFormGroupTreeExpansion(selectedGroupId: string) {
  Object.keys(formExpandedGroups).forEach((groupId) => delete formExpandedGroups[groupId])

  findGroupPath(selectedGroupId).forEach((groupId) => {
    formExpandedGroups[groupId] = true
  })
}

function collapseAllGroups() {
  Object.keys(expandedGroups).forEach((groupId) => {
    expandedGroups[groupId] = false
  })
}

const tabs = computed(() =>
  openedSessionNames.value
    .filter((name) => Boolean(findHost(name)))
    .map((name) => ({name, selected: activeSession.value?.name === name, status: findHost(name)?.status ?? 'idle'})),
)


</script>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: calc(var(--drawer-width) + 48px) minmax(0, 1fr);
  grid-template-rows: 38px minmax(0, 1fr) 30px;
  width: 100vw;
  max-width: 100vw;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  background: var(--color-bg);
  transition: grid-template-columns 0.22s ease, background 0.4s ease, color 0.3s ease;
}

.app-shell.theme-midnight {
  --accent: #a78bfa;
  --accent-strong: #7c3aed;
  --surface-strong: rgba(20, 18, 42, 0.9);
  --surface-soft: rgba(30, 27, 75, 0.45);
  --workspace-bg: #050312;
  --color-bg: var(--workspace-bg);
  --color-panel: var(--surface-strong);
  --color-border: rgba(167, 139, 250, 0.24);
  --color-text-muted: #a5b4fc;
  --terminal-bg: #03010c;
  --bg-glow-1: rgba(139, 92, 246, 0.24);
  --bg-glow-2: rgba(236, 72, 153, 0.18);
  --bg-base: #050312;
}

.app-shell.theme-contrast {
  --accent: #22d3ee;
  --accent-strong: #0891b2;
  --surface-strong: rgba(3, 7, 18, 0.98);
  --surface-soft: rgba(15, 23, 42, 0.72);
  --workspace-bg: #020617;
  --color-bg: var(--workspace-bg);
  --color-panel: var(--surface-strong);
  --color-border: rgba(34, 211, 238, 0.24);
  --color-text-muted: #94a3b8;
  --terminal-bg: #00040d;
  --bg-glow-1: rgba(34, 211, 238, 0.2);
  --bg-glow-2: rgba(20, 184, 166, 0.16);
  --bg-base: #020617;
}

.app-shell.drawer-closed {
  grid-template-columns: 48px minmax(0, 1fr);
}

.sidebar-shell {
  grid-row: 2;
  position: relative;
  display: grid;
  grid-template-columns: 48px var(--drawer-width);
  min-width: 0;
  background: var(--idea-chrome);
  backdrop-filter: none;
  overflow: hidden;
}

.drawer-closed .sidebar-shell {
  grid-template-columns: 48px 0;
}

.sidebar-resizer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  width: 6px;
  cursor: col-resize;
}

.sidebar-resizer:hover {
  background: rgba(56, 189, 248, 0.18);
}

.context-menu {
  position: fixed;
  z-index: var(--z-popover);
  display: grid;
  gap: 3px;
  min-width: 168px;
  padding: 6px;
  border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--idea-border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--idea-panel) 92%, transparent);
  box-shadow: 0 16px 42px rgba(0, 0, 0, 0.3), inset 0 1px rgba(255, 255, 255, 0.04);
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  transform: scale(0.96) translateY(-4px);
  transition: opacity var(--motion-fast), transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), visibility var(--motion-fast);
  backdrop-filter: blur(16px);
}

.context-menu.visible {
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
  transform: scale(1) translateY(0);
}

.context-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 9px;
  border-radius: 7px;
  background: transparent;
  color: var(--idea-text-muted);
  font-size: 12px;
  text-align: left;
}

.context-menu button.separated {
  margin-top: 4px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  padding-top: 9px;
}

.context-menu .menu-icon {
  display: inline-grid;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: color-mix(in srgb, var(--accent) 82%, #ffffff);
  font-size: 11px;
}

.context-menu button:hover {
  background: var(--idea-accent-soft);
  color: #f8fafc;
}

.context-menu button.danger {
  color: #fecdd3;
}

.context-menu button.danger .menu-icon {
  background: color-mix(in srgb, var(--status-danger) 12%, transparent);
  color: #fecaca;
}

.context-menu button.danger:hover {
  background: color-mix(in srgb, var(--status-danger) 18%, transparent);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.46);
  backdrop-filter: blur(4px);
  animation: modal-fade-in 0.18s ease;
}

@keyframes modal-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.drawer-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 280px;
  min-height: 0;
  padding: 8px 8px;
  border-right: 1px solid var(--idea-border);
  overflow: hidden;
  background: var(--idea-panel);
}

.drawer-header,
.tree-toolbar,
:deep(.tree-group-header),
:deep(.tree-host),
.workspace-toolbar,
.toolbar-context,
.toolbar-actions,
.command-search,
.pane-tabs,
.metric-row,
.transfer-item {
  display: flex;
  align-items: center;
}

.drawer-header {
  justify-content: space-between;
  gap: 12px;
  min-height: 38px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.drawer-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.drawer-subtitle,
:deep(.host-copy small),
.file-copy small,
.terminal-header small,
.muted {
  color: #8b9bb0;
}

.drawer-subtitle,
:deep(.host-copy small),
.file-copy small,
.terminal-header small {
  display: block;
  margin-top: 2px;
  font-size: 11px;
}

.drawer-badge {
  flex: 0 0 auto;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.9);
  color: #93c5fd;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.drawer-badge.online {
  color: #86efac;
}

.drawer-close {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.86);
  color: #94a3b8;
}

.connect-button {
  padding: 10px 12px;
  border-radius: 14px;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  box-shadow: 0 14px 34px rgba(37, 99, 235, 0.34);
  font-weight: 700;
}

.search-box {
  display: flex;
  gap: 5px;
  align-items: center;
  min-height: 26px;
  padding: 3px 6px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 7px;
  background: rgba(8, 11, 18, 0.44);
  color: #64748b;
  font-size: 12px;
  transition: border-color var(--motion-fast), background var(--motion-fast), box-shadow var(--motion-fast);
}

.search-box:focus-within {
  border-color: var(--state-border);
  background: rgba(8, 11, 18, 0.62);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
  color: #93c5fd;
}

.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #e5edf8;
}

.session-tree,
.file-list {
  position: relative;
  z-index: 1;
  display: grid;
  flex: 1 1 auto;
  align-content: start;
  gap: 2px;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-top: 4px;
  padding-right: 2px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.tree-toolbar {
  justify-content: flex-end;
  margin: -4px -2px 2px;
  padding: 2px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(8, 11, 18, 0.22);
}

.tree-actions {
  display: flex;
  gap: 4px;
}

.tree-actions button {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 6px;
  background: rgba(30, 41, 59, 0.72);
  color: #94a3b8;
}

.section-title,
.panel-title {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

:deep(.tree-group) {
  position: relative;
  display: grid;
  gap: 2px;
  min-width: 0;
}

:deep(.tree-group-header),
:deep(.tree-host) {
  position: relative;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 6px;
  text-align: left;
  transition: border-color var(--motion-fast), background var(--motion-fast), box-shadow var(--motion-fast), color var(--motion-fast), opacity var(--motion-fast);
}

:deep(.tree-group-header::before),
:deep(.tree-host::before) {
  position: absolute;
  top: 5px;
  bottom: 5px;
  left: 0;
  width: 3px;
  border-radius: 999px;
  background: transparent;
  content: '';
}

:deep(.tree-group-header) {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  min-height: 27px;
  padding: 4px 7px 4px 5px;
  background: transparent;
  color: var(--idea-text-muted);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  user-select: none;
  white-space: nowrap;
}

:deep(.tree-group-header strong),
:deep(.host-copy strong) {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.tree-group-header small) {
  flex: 0 0 auto;
  margin-left: auto;
  color: color-mix(in srgb, var(--idea-text-muted) 68%, transparent);
  font-size: 10px;
  font-weight: 700;
}

:deep(.tree-chevron) {
  display: inline-grid;
  width: 14px;
  height: 18px;
  place-items: center;
  color: color-mix(in srgb, var(--idea-text-muted) 78%, transparent);
  transition: color var(--motion-fast), transform var(--motion-base);
}

:deep(.tree-chevron svg),
:deep(.folder-icon svg) {
  display: block;
  stroke-width: 2;
}

:deep(.tree-group-header:hover .tree-chevron) {
  color: color-mix(in srgb, var(--accent) 76%, #ffffff);
}

:deep(.folder-icon) {
  display: inline-grid;
  min-width: 22px;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: color-mix(in srgb, var(--accent) 82%, #dbeafe);
}

:deep(.tree-group:not(.collapsed) > .tree-group-header .folder-icon) {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: color-mix(in srgb, var(--accent) 92%, #ffffff);
}

:deep(.tree-children) {
  position: relative;
  display: grid;
  gap: 2px;
  min-width: 0;
  max-width: 100%;
  margin-left: 13px;
  padding-left: 12px;
  overflow-x: hidden;
}

:deep(.tree-children::before) {
  position: absolute;
  top: 1px;
  bottom: 7px;
  left: 3px;
  width: 1px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 30%, transparent), rgba(148, 163, 184, 0.08));
  content: '';
}

:deep(.tree-host) {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  min-height: 27px;
  padding: 4px 7px 4px 5px;
  background: transparent;
  color: var(--idea-text-muted);
  cursor: pointer;
  font-size: 12px;
  font-weight: 400;
  user-select: none;
  white-space: nowrap;
}

:deep(.tree-host .host-copy strong) {
  color: var(--idea-text);
}

:deep(.tree-group-header:hover),
:deep(.tree-host:hover) {
  border-color: color-mix(in srgb, var(--accent) 18%, transparent);
  background: var(--state-hover);
  color: var(--idea-text);
}

:deep(.tree-group-header:hover::before),
:deep(.tree-host:hover::before) {
  background: color-mix(in srgb, var(--accent) 38%, transparent);
}

:deep(.tree-group.locked > .tree-group-header) {
  cursor: pointer;
}

:deep(.tree-group.locked.dragging > .tree-group-header) {
  opacity: 1;
}

:deep(.tree-group.drop-invalid > .tree-group-header) {
  border-color: color-mix(in srgb, var(--status-danger) 62%, transparent);
  background: color-mix(in srgb, var(--status-danger) 15%, transparent);
  color: #fecaca;
  animation: invalid-drop-pulse 0.28s ease;
}

:deep(.tree-group.drop-invalid > .tree-group-header::before) {
  background: var(--status-danger);
}

:deep(.tree-group.dragging > .tree-group-header),
:deep(.tree-host.dragging) {
  cursor: grabbing;
  opacity: 0.42;
}

:deep(.tree-group.drag-over-before > .tree-group-header),
:deep(.tree-group.drag-over-after > .tree-group-header),
:deep(.tree-group.drag-over-inside > .tree-group-header),
:deep(.tree-group.host-drop-target > .tree-group-header),
:deep(.tree-host.drag-over-before),
:deep(.tree-host.drag-over-after) {
  background: color-mix(in srgb, var(--accent) 13%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 26%, transparent);
}

:deep(.tree-group.drag-over-before > .tree-group-header),
:deep(.tree-host.drag-over-before) {
  border-top-color: var(--accent);
  box-shadow: inset 0 2px 0 var(--accent), inset 0 8px 12px -10px var(--accent);
}

:deep(.tree-group.drag-over-after > .tree-group-header),
:deep(.tree-host.drag-over-after) {
  border-bottom-color: var(--accent);
  box-shadow: inset 0 -2px 0 var(--accent), inset 0 -8px 12px -10px var(--accent);
}

:deep(.tree-group.drag-over-inside > .tree-group-header) {
  border-color: color-mix(in srgb, var(--accent) 64%, transparent);
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  box-shadow: inset 3px 0 0 var(--accent), 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent);
}

:deep(.tree-group.host-drop-target > .tree-group-header) {
  border-color: color-mix(in srgb, var(--status-online) 56%, transparent);
  background: color-mix(in srgb, var(--status-online) 13%, transparent);
  box-shadow: inset 3px 0 0 var(--status-online), 0 0 0 1px color-mix(in srgb, var(--status-online) 16%, transparent);
}

:deep(.tree-group-header:active),
:deep(.tree-host:active) {
  background: var(--state-active);
  color: #f8fafc;
}

:deep(.tree-host.active) {
  border-color: var(--state-border);
  background: linear-gradient(90deg, var(--state-active), transparent 140%);
  color: var(--idea-text);
}

:deep(.tree-host.active::before) {
  background: var(--accent);
}

:deep(.tree-host.active) {
  box-shadow: inset 3px 0 0 var(--accent), inset 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent);
}

:deep(.host-copy mark),
:deep(.tree-group-header mark) {
  border-radius: 3px;
  background: color-mix(in srgb, var(--accent) 32%, transparent);
  color: #ffffff;
}

:deep(.status-label) {
  flex: 0 0 auto;
  padding: 1px 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--status-idle) 20%, transparent);
  color: color-mix(in srgb, var(--idea-text-muted) 76%, transparent);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

:deep(.status-dot.online + .status-label) {
  background: var(--status-online-soft);
  color: #bbf7d0;
}

:deep(.status-dot.connecting + .status-label) {
  background: var(--status-warning-soft);
  color: #fde68a;
}

:deep(.status-dot.error + .status-label) {
  background: var(--status-danger-soft);
  color: #fecaca;
}

:deep(.tree-branch) {
  width: 10px;
  height: 1px;
  background: color-mix(in srgb, var(--accent) 28%, rgba(148, 163, 184, 0.24));
}

@keyframes invalid-drop-pulse {
  0%, 100% {
    transform: translateX(0);
  }
  35% {
    transform: translateX(-2px);
  }
  70% {
    transform: translateX(2px);
  }
}

:deep(.status-dot),
.online-dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--status-idle);
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

:deep(.status-dot.idle),
.online-dot.idle {
  background: #64748b;
  box-shadow: none;
}

:deep(.status-dot.connecting) {
  background: var(--status-warning);
  box-shadow: 0 0 10px color-mix(in srgb, var(--status-warning) 52%, transparent);
}

:deep(.status-dot.connected),
:deep(.status-dot.online),
.online-dot:not(.idle) {
  background: var(--status-online);
  box-shadow: 0 0 0 3px var(--status-online-soft), 0 0 12px color-mix(in srgb, var(--status-online) 45%, transparent);
}

:deep(.status-dot.error) {
  background: var(--status-danger);
  box-shadow: 0 0 10px color-mix(in srgb, var(--status-danger) 52%, transparent);
}

:deep(.host-copy),
.file-copy {
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.file-copy strong {
  display: block;
  overflow: hidden;
  font-size: 12px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.host-latency {
  color: #93c5fd;
  font-size: 12px;
}

.path-card,
.transfer-panel,
.panel-card,
.session-workbench {
  border: 1px solid rgba(148, 163, 184, 0.13);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.5);
}

.path-card {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 3px 8px;
  padding: 10px;
}

.path-card span {
  grid-column: 1 / -1;
  color: #94a3b8;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.path-card strong {
  min-width: 0;
  overflow: hidden;
  color: #bfdbfe;
  font-size: 12px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.path-card button {
  padding: 3px 7px;
  border-radius: 7px;
  background: rgba(30, 41, 59, 0.86);
  color: #94a3b8;
  font-size: 11px;
}

.compact-path-card {
  display: flex;
  gap: 4px;
  align-items: center;
  min-height: 26px;
  padding: 3px 4px;
}

.path-breadcrumb {
  display: flex;
  flex: 1 1 auto;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
}

.path-breadcrumb button {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  padding: 2px 5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-file-list {
  gap: 1px;
  justify-items: stretch;
  overflow: auto;
}

.sftp-empty,
.sftp-status {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.3);
  color: #94a3b8;
  font-size: 12px;
}

.sftp-empty div {
  color: #dbeafe;
  font-weight: 700;
}

.sftp-status {
  margin-top: 6px;
}

.transfer-panel {
  display: grid;
  gap: 8px;
  padding: 10px;
}

.command-chip {
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.9);
  color: #a5b4fc;
  font-size: 12px;
}

.workspace {
  grid-row: 2;
  display: grid;
  grid-template-rows: 32px minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #1e1f22;
}

.workspace.home-mode {
  grid-template-rows: minmax(0, 1fr);
}

.workspace-toolbar {
  gap: 12px;
  min-width: 0;
  padding: 7px 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  background: linear-gradient(180deg, var(--surface-strong), rgba(8, 11, 18, 0.88));
  box-shadow: inset 0 -1px rgba(255, 255, 255, 0.02), 0 12px 28px rgba(0, 0, 0, 0.18);
}

.toolbar-context {
  flex: 0 0 auto;
  gap: 8px;
  min-width: 0;
  color: #e2e8f0;
}

.toolbar-context strong {
  font-size: 13px;
}

.environment-badge {
  padding: 3px 7px;
  border: 1px solid rgba(244, 63, 94, 0.24);
  border-radius: 999px;
  background: rgba(127, 29, 29, 0.22);
  color: #fecdd3;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.toolbar-kicker,
.toolbar-meta {
  color: #8b9bb0;
  font-size: 11px;
}

.toolbar-kicker {
  padding: 3px 7px;
  border: 1px solid rgba(34, 197, 94, 0.18);
  border-radius: 999px;
  background: rgba(22, 101, 52, 0.12);
  color: #86efac;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.toolbar-actions {
  gap: 6px;
  flex: 0 0 auto;
}

.toolbar-divider {
  flex: 0 0 auto;
  width: 1px;
  height: 22px;
  background: linear-gradient(180deg, transparent, rgba(148, 163, 184, 0.28), transparent);
}

.toolbar-divider.compact {
  margin-left: auto;
}

.toolbar-button,
.icon-button {
  height: 28px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 9px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.86), rgba(15, 23, 42, 0.76));
  color: #cbd5e1;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.04);
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.toolbar-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
  transform: none;
}

.toolbar-button {
  padding: 0 10px;
  font-size: 12px;
  font-weight: 700;
}

.toolbar-button.primary {
  border-color: color-mix(in srgb, var(--accent) 48%, transparent);
  background: linear-gradient(135deg, var(--accent-strong), #4f46e5);
  color: #f8fafc;
}

.toolbar-button.danger,
.connection-dropdown .danger {
  color: var(--danger-text);
}

.toolbar-button:hover,
.icon-button:hover,
.add-tab:hover,
.pane-add:hover,
.pane-action:hover {
  border-color: var(--state-border);
  background: var(--state-hover);
  color: #f8fafc;
}

.command-search {
  flex: 1;
  min-width: 180px;
  max-width: 460px;
  height: 28px;
  gap: 8px;
  padding: 0 8px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.52);
  color: #64748b;
  transition: border-color var(--motion-fast), background var(--motion-fast), box-shadow var(--motion-fast), color var(--motion-fast);
}

.command-search:focus-within {
  border-color: var(--state-border);
  background: rgba(2, 6, 23, 0.68);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
  color: #93c5fd;
}

.command-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #e5edf8;
  font-size: 12px;
}

.command-search kbd {
  padding: 2px 6px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.84);
  color: #94a3b8;
  font-size: 10px;
  font-family: inherit;
}

.utility-actions {
  margin-left: auto;
}

.icon-button {
  display: grid;
  width: 30px;
  place-items: center;
  font-size: 14px;
}

.connection-menu,
.more-menu {
  position: relative;
}

.connection-dropdown,
.more-dropdown {
  position: absolute;
  top: calc(100% + 7px);
  right: 0;
  z-index: 20;
  display: grid;
  gap: 4px;
  min-width: 168px;
  padding: 6px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.98);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.42);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px) scale(0.98);
  transform-origin: top right;
  transition: opacity var(--motion-fast), transform var(--motion-fast), visibility var(--motion-fast);
  visibility: hidden;
}

.connection-menu:hover .connection-dropdown,
.connection-menu:focus-within .connection-dropdown,
.more-menu:hover .more-dropdown,
.more-menu:focus-within .more-dropdown {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scale(1);
  visibility: visible;
}

.connection-dropdown button,
.more-dropdown button {
  width: 100%;
  padding: 8px 9px;
  border-radius: 8px;
  background: transparent;
  color: #cbd5e1;
  text-align: left;
}

.connection-dropdown button:hover,
.more-dropdown button:hover {
  background: var(--state-hover);
}

.more-dropdown label {
  display: grid;
  gap: 6px;
  padding: 8px 9px;
  color: #94a3b8;
  font-size: 11px;
  text-align: left;
}

.more-dropdown select {
  width: 100%;
  height: 28px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  outline: 0;
  background: rgba(15, 23, 42, 0.94);
  color: #dbeafe;
  font: inherit;
  font-size: 12px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 0;
}

.content-grid.empty-mode {
  min-height: 0;
}

.empty-state-card {
  display: grid;
  place-items: center;
  align-content: center;
  justify-self: stretch;
  align-self: stretch;
  gap: 14px;
  min-height: 0;
  padding: 32px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 0;
  background: var(--idea-bg);
  text-align: center;
  box-shadow: none;
}

.session-workbench {
  display: grid;
  grid-template-rows: var(--editor-height) 4px minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-color: var(--idea-border);
  border-radius: 0;
  background: var(--workspace-bg);
  box-shadow: none;
}

.session-workbench.editor-hidden {
  grid-template-rows: minmax(0, 1fr);
}

.editor-pane,
.terminal-pane {
  display: grid;
  grid-template-rows: 28px minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
}

.workbench-resizer {
  position: relative;
  z-index: 4;
  cursor: row-resize;
  background: linear-gradient(180deg, transparent, var(--idea-border), transparent);
  transition: background var(--motion-fast), box-shadow var(--motion-fast);
}

.workbench-resizer::before {
  position: absolute;
  top: 1px;
  right: 42%;
  left: 42%;
  height: 2px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.34);
  content: '';
  transition: background var(--motion-base), box-shadow var(--motion-base), left var(--motion-base), right var(--motion-base);
}

.workbench-resizer:hover {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent);
}

.workbench-resizer:hover::before {
  right: 36%;
  left: 36%;
  background: var(--accent);
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 45%, transparent);
}

.terminal-pane {
  grid-template-rows: 28px minmax(0, 1fr);
  position: relative;
  background: var(--workspace-bg);
  box-shadow: none;
}

.editor-pane {
  border-bottom: 1px solid var(--idea-border);
  background: var(--workspace-bg);
}

.pane-tabs {
  gap: 2px;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 2px 8px;
  border-bottom: 1px solid var(--idea-border);
  background: var(--idea-chrome);
  scrollbar-width: none;
}

.pane-tabs::-webkit-scrollbar {
  display: none;
}

.pane-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  flex: 0 0 auto;
  max-width: 180px;
  padding: 0 8px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-top: 2px solid transparent;
  border-radius: 7px 7px 0 0;
  background: color-mix(in srgb, var(--surface-soft) 62%, transparent);
  color: var(--idea-text-muted);
  font-size: 12px;
  transition: border-color var(--motion-fast), background var(--motion-fast), color var(--motion-fast), box-shadow var(--motion-fast);
}

.pane-tab.selected {
  border-color: color-mix(in srgb, var(--accent) 34%, var(--idea-border));
  border-top-color: var(--accent);
  background: color-mix(in srgb, var(--idea-bg) 88%, transparent);
  color: var(--idea-text);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.04);
}

.editor-file-tab {
  flex: 0 1 auto;
  max-width: 180px;
}

.pane-tab-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.terminal-status-dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--status-idle);
}

.terminal-status-dot.status-connecting,
.terminal-status-dot.status-reconnecting {
  background: var(--status-warning);
  box-shadow: 0 0 10px color-mix(in srgb, var(--status-warning) 52%, transparent);
}

.terminal-status-dot.status-connected {
  background: var(--status-online);
  box-shadow: 0 0 10px color-mix(in srgb, var(--status-online) 52%, transparent);
}

.terminal-status-dot.status-disconnected {
  background: var(--status-idle);
}

.terminal-status-dot.status-error {
  background: var(--status-danger);
  box-shadow: 0 0 10px color-mix(in srgb, var(--status-danger) 52%, transparent);
}

.pane-tab-close {
  display: grid;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  place-items: center;
  border-radius: 5px;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1;
  opacity: 0.78;
  transition: opacity var(--motion-fast), background var(--motion-fast), color var(--motion-fast);
}

.pane-tab:hover .pane-tab-close,
.pane-tab.selected .pane-tab-close {
  opacity: 1;
  color: #cbd5e1;
}

.pane-tab-close:hover {
  background: var(--danger-soft);
  color: var(--danger-text);
  opacity: 1;
}

.dirty-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--status-warning);
  box-shadow: 0 0 8px color-mix(in srgb, var(--status-warning) 48%, transparent);
}

.pane-tab.dirty .pane-tab-title {
  color: #fde68a;
}

.pane-tab:hover {
  border-color: color-mix(in srgb, var(--accent) 24%, var(--idea-border));
  background: color-mix(in srgb, var(--accent) 9%, transparent);
  color: #dbeafe;
}

.pane-tab small {
  color: #64748b;
}

.tab-more-select {
  flex: 0 0 auto;
  max-width: 108px;
  height: 24px;
  padding: 0 22px 0 8px;
  border: 1px solid color-mix(in srgb, var(--accent) 32%, var(--idea-border));
  border-radius: 7px 7px 0 0;
  background: color-mix(in srgb, var(--accent) 12%, var(--idea-chrome));
  color: var(--idea-text);
  font-size: 11px;
  font-weight: 700;
  outline: 0;
  cursor: pointer;
}

.tab-more-select:hover,
.tab-more-select:focus {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 18%, var(--idea-chrome));
  color: #f8fafc;
}

.pane-add,
.pane-action {
  height: 22px;
  padding: 0 7px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0;
  background: rgba(15, 23, 42, 0.42);
  color: #94a3b8;
  font-size: 12px;
}

.pane-add:hover,
.pane-action:hover {
  background: rgba(148, 163, 184, 0.08);
  color: #dbeafe;
}

.pane-action {
  margin-left: auto;
}

.pane-action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.editor-surface {
  min-height: 0;
  overflow: hidden;
  background: #070c18;
}

.editor-empty {
  display: grid;
  height: 100%;
  place-items: center;
  padding: 24px;
  color: #64748b;
  font-size: 13px;
}

.visually-hidden {
  position: fixed;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.terminal-screen {
  position: relative;
  padding: 18px 18px 14px;
  overflow: hidden;
  background: radial-gradient(circle at 0% 0%, rgba(34, 197, 94, 0.075), transparent 30%),
  linear-gradient(rgba(14, 165, 233, 0.028) 1px, transparent 1px),
  var(--terminal-bg);
  background-size: 100% 24px;
  color: #d7e1ef;
  font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
  font-size: 13px;
  line-height: 1.58;
  box-shadow: inset 0 0 0 1px rgba(14, 165, 233, 0.04), inset 0 24px 64px rgba(0, 0, 0, 0.16);
}

.terminal-screen::before {
  position: absolute;
  top: 10px;
  right: 14px;
  padding: 3px 7px;
  border: 1px solid rgba(34, 197, 94, 0.24);
  border-radius: 999px;
  background: rgba(22, 101, 52, 0.16);
  color: #86efac;
  font-family: Inter, "Segoe UI", system-ui, sans-serif;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  content: 'SECURE SSH';
}

.terminal-screen.actual-terminal {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0;
  background: var(--terminal-bg);
}

.terminal-screen.actual-terminal.terminal-hidden {
  position: absolute;
  inset: 0;
  visibility: hidden;
  overflow: hidden;
  pointer-events: none;
}

.terminal-screen.actual-terminal::before {
  display: none;
}

.terminal-screen.actual-terminal :deep(.terminal-wrap),
.terminal-screen.actual-terminal :deep(.terminal),
.terminal-screen.actual-terminal :deep(.xterm),
.terminal-screen.actual-terminal :deep(.xterm-viewport),
.terminal-screen.actual-terminal :deep(.xterm-screen),
.terminal-screen.actual-terminal :deep(.xterm-helpers) {
  width: 100%;
  height: 100%;
}

.terminal-screen p {
  margin: 0;
  white-space: nowrap;
}

.prompt {
  color: #38bdf8;
}

.prompt {
  color: var(--status-transfer);
}

.path {
  color: #a78bfa;
}

.success {
  color: var(--status-online);
}

.warning {
  color: var(--status-warning);
}

.cursor {
  display: inline-block;
  width: 8px;
  height: 18px;
  transform: translateY(3px);
  background: #e5edf8;
  animation: blink 1s steps(2, start) infinite;
}

.transfer-item {
  justify-content: space-between;
}

.progress-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.92);
}

.progress-track span {
  display: block;
  width: 72%;
  height: 100%;
  border-radius: inherit;
  background: var(--status-transfer);
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.broadcast-toggle {
  min-width: 42px;
}

.broadcast-toggle.active {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.14) !important;
}


.session-tree-drag-ghost {
  position: fixed;
  z-index: var(--z-context-menu);
  display: flex;
  align-items: center;
  gap: 9px;
  max-width: 260px;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--accent) 42%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--idea-panel) 88%, transparent);
  box-shadow: var(--shadow-popover), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  color: var(--idea-text);
  font-size: 12px;
  line-height: 1.35;
  pointer-events: none;
  transform: translate3d(0, 0, 0);
  backdrop-filter: blur(14px);
}

.session-tree-drag-ghost.drag-host {
  border-color: color-mix(in srgb, var(--status-online) 44%, transparent);
}

.drag-ghost-icon {
  display: grid;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 7px;
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: color-mix(in srgb, var(--accent) 85%, #ffffff);
}

.session-tree-drag-ghost.drag-host .drag-ghost-icon {
  background: color-mix(in srgb, var(--status-online) 16%, transparent);
  color: #bbf7d0;
}

.drag-ghost-copy {
  display: grid;
  min-width: 0;
}

.drag-ghost-copy strong,
.drag-ghost-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drag-ghost-copy strong {
  max-width: 190px;
  font-weight: 800;
}

.drag-ghost-copy small {
  max-width: 210px;
  color: var(--idea-text-muted);
  font-size: 10px;
}

/* --- Quick Open (Ctrl+P) --- */
.quick-open-backdrop {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 18vh;
  background: rgba(2, 6, 23, 0.6);
  backdrop-filter: blur(4px);
}

.quick-open-dialog {
  width: 480px;
  max-width: 92vw;
  border: 1px solid var(--idea-border);
  border-radius: var(--radius-md);
  background: var(--idea-panel);
  box-shadow: var(--shadow-popover);
  overflow: hidden;
  animation: quick-open-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes quick-open-in {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.quick-open-dialog input {
  width: 100%;
  padding: 11px 14px;
  border: 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  background: transparent;
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
}

.quick-open-dialog input::placeholder {
  color: #64748b;
}

.quick-open-results {
  max-height: 320px;
  overflow-y: auto;
}

.quick-open-results button {
  display: grid;
  grid-template-columns: 20px 1fr auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border: 0;
  background: transparent;
  color: #cbd5e1;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.quick-open-results button:hover,
.quick-open-results button.selected {
  background: var(--idea-accent-soft);
  color: #f8fafc;
}

.qo-icon {
  font-size: 10px;
}

.qo-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.qo-path {
  font-size: 10px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-open-empty {
  padding: 24px;
  text-align: center;
  color: #64748b;
  font-size: 12px;
}
</style>
