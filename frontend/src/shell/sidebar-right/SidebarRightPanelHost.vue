<template>
  <component v-if="activePanel" :is="activePanel.component" v-bind="activePanel.props" />
  <EmptyState
    v-else
    compact
    icon="ℹ"
    title="Info"
    description="Select an inspector tab to view connection or SFTP context."
  />
</template>

<script setup lang="ts">
import {useActiveRightSidebarPanel} from '../../features/workspace/right-sidebar-panel-registry'
import {EmptyState} from '../../shared/ui'

const activePanel = useActiveRightSidebarPanel()
</script>
