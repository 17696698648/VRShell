<template>
  <header class="titlebar">
    <div class="titlebar__brand">
      <img class="titlebar__logo" src="/app-icon.png" alt="VRShell" />
    </div>
    <WorkspaceContext />
    <WindowControls />
  </header>
</template>

<script setup lang="ts">
import WindowControls from './WindowControls.vue'
import WorkspaceContext from './WorkspaceContext.vue'
</script>
