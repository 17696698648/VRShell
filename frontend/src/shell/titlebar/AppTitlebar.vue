<template>
  <header class="titlebar">
    <div class="titlebar__brand">
      <span class="titlebar__logo">VR</span>
      <div>
        <strong>VRShell</strong>
        <small>Workspace Architecture Preview</small>
      </div>
    </div>
    <WindowMenuBar />
    <WorkspaceContext />
    <WindowControls />
  </header>
</template>

<script setup lang="ts">
import WindowControls from './WindowControls.vue'
import WindowMenuBar from './WindowMenuBar.vue'
import WorkspaceContext from './WorkspaceContext.vue'
</script>
