<template>
  <WorkbenchShell :class="{'workbench-shell--terminal-active': terminalState.tabs.length > 0}">
    <template #sidebar>
      <SidebarPanelHost/>
    </template>

    <template #main>
      <WorkbenchLayout
        :mode="mainLayoutMode"
        :preset="workspaceState.layoutPreset"
        :dock-placement="workspaceState.panelPlacement"
        :main-split-ratio="workspaceState.mainSplitRatio"
        :bottom-panel-height="workspaceState.bottomPanelHeight"
        :right-dock-width="workspaceState.rightDockWidth"
      >
        <template #primary>
          <WelcomePage v-if="terminalState.tabs.length === 0" />
          <SessionWorkbench v-else />
        </template>
        <template v-if="showEditorWorkbench" #secondary>
          <EditorWorkbench/>
        </template>
        <template v-if="activeBottomDockPanel" #dock>
          <DockHost />
        </template>
      </WorkbenchLayout>
    </template>
  </WorkbenchShell>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {terminalState} from '../../entities/terminal'
import {workspaceState} from '../../entities/workspace'
import {useActiveDockPanel} from '../../features/workspace/dock-registry'
import DockHost from '../../shell/dock/DockHost.vue'
import SidebarPanelHost from '../../shell/sidebar/SidebarPanelHost.vue'
import WorkbenchShell from '../../shell/WorkbenchShell.vue'
import EditorWorkbench from '../../widgets/editor-workbench/ui/EditorWorkbench.vue'
import SessionWorkbench from '../../widgets/session-workbench/ui/SessionWorkbench.vue'
import {WorkbenchLayout} from '../../widgets/workbench-layout'
import WelcomePage from '../welcome/WelcomePage.vue'

const activeDockPanel = useActiveDockPanel()
const activeBottomDockPanel = computed(() => workspaceState.panelPlacement === 'bottom' ? activeDockPanel.value : null)
const showEditorWorkbench = computed(() => workspaceState.activeMainView === 'editor')
const mainLayoutMode = computed(() => workspaceState.compactMode || !showEditorWorkbench.value ? 'single' : workspaceState.mainAreaMode)
</script>
