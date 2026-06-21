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
    <WorkspaceTabs />
    <WindowControls />
  </header>
</template>

<script setup lang="ts">
import WindowControls from './WindowControls.vue'
import WindowMenuBar from './WindowMenuBar.vue'
import WorkspaceTabs from './WorkspaceTabs.vue'
</script>
