<template>
  <WorkbenchShell>
    <template #sidebar>
      <SidebarPanelHost/>
    </template>

    <template #main>
      <SettingsPage v-if="workspaceState.activeMainView === 'settings'"/>
      <WorkbenchLayout
        v-else
        :mode="workspaceState.compactMode ? 'single' : workspaceState.mainAreaMode"
        :preset="workspaceState.layoutPreset"
        :dock-placement="workspaceState.panelPlacement"
        :style="layoutStyle"
      >
        <template #primary>
          <WelcomePage v-if="terminalState.tabs.length === 0" />
          <TerminalWorkbench v-else />
        </template>
        <template #secondary>
          <EditorWorkbench/>
        </template>
        <template v-if="activeDockPanel" #dock>
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
import TerminalWorkbench from '../../widgets/terminal-workbench/ui/TerminalWorkbench.vue'
import {WorkbenchLayout} from '../../widgets/workbench-layout'
import SettingsPage from '../settings/SettingsPage.vue'
import WelcomePage from '../welcome/WelcomePage.vue'

const activeDockPanel = useActiveDockPanel()
const layoutStyle = computed(() => ({
  '--dock-bottom-height': `${workspaceState.bottomPanelHeight}px`,
  '--dock-right-width': `${workspaceState.rightDockWidth}px`,
}))
</script>
