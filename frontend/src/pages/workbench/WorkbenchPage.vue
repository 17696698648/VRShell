<template>
  <WorkbenchShell class="workbench-shell--main-flush" :dock-visible="Boolean(activeBottomDockPanel)">
    <template #sidebar-left>
      <SidebarLeftPanelHost/>
    </template>

    <template #sidebar-right>
      <SidebarRightPanelHost/>
    </template>

    <template #main>
      <WelcomePage v-if="terminalState.tabs.length === 0" />
      <WorkbenchLayout
        v-else
        :mode="mainLayoutMode"
        :preset="workspaceState.layoutPreset"
        :main-split-ratio="workspaceState.mainSplitRatio"
      >
        <template #primary>
          <SessionWorkbench />
        </template>
        <template v-if="showEditorWorkbench" #secondary>
          <EditorWorkbench/>
        </template>
      </WorkbenchLayout>
    </template>

    <template v-if="activeBottomDockPanel" #dock>
      <DockHost />
    </template>
  </WorkbenchShell>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {terminalState} from '../../entities/terminal'
import {workspaceState} from '../../entities/workspace'
import {useBottomDockPanel} from '../../features/workspace/dock-registry'
import DockHost from '../../shell/dock/DockHost.vue'
import SidebarLeftPanelHost from '../../shell/sidebar-left/SidebarLeftPanelHost.vue'
import SidebarRightPanelHost from '../../shell/sidebar-right/SidebarRightPanelHost.vue'
import WorkbenchShell from '../../shell/WorkbenchShell.vue'
import EditorWorkbench from '../../widgets/editor-workbench/ui/EditorWorkbench.vue'
import SessionWorkbench from '../../widgets/session-workbench/ui/SessionWorkbench.vue'
import {WorkbenchLayout} from '../../widgets/workbench-layout'
import WelcomePage from '../welcome/WelcomePage.vue'

const activeBottomDockPanel = useBottomDockPanel()
const showEditorWorkbench = computed(() => workspaceState.activeMainView === 'editor')
const mainLayoutMode = computed(() => workspaceState.compactMode || !showEditorWorkbench.value ? 'single' : workspaceState.mainAreaMode)
</script>
