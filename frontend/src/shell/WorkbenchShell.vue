<template>
  <div class="workbench-shell">
    <AppTitlebar/>
    <div class="workbench-shell__body">
      <ActivityBar/>
      <Sidebar v-if="workspaceState.sidebarVisible" :width="workspaceState.sidebarWidth">
        <slot name="sidebar"/>
      </Sidebar>
      <main class="workbench-shell__main">
        <slot name="main">
          <slot/>
        </slot>
      </main>
    </div>
    <StatusBar/>
    <CommandPaletteHost/>
    <QuickOpenHost/>
    <ContextMenuHost/>
    <DialogHost/>
    <ToastHost/>
  </div>
</template>

<script setup lang="ts">
import {workspaceState} from '../entities/workspace'
import ActivityBar from './activity-bar/ActivityBar.vue'
import CommandPaletteHost from './overlays/CommandPaletteHost.vue'
import ContextMenuHost from './overlays/ContextMenuHost.vue'
import DialogHost from './overlays/DialogHost.vue'
import QuickOpenHost from './overlays/QuickOpenHost.vue'
import ToastHost from './overlays/ToastHost.vue'
import Sidebar from './sidebar/Sidebar.vue'
import StatusBar from './status-bar/StatusBar.vue'
import AppTitlebar from './titlebar/AppTitlebar.vue'
</script>
