<template>
  <component v-if="activePanel" :is="activePanel.component" v-bind="activePanel.props" />
  <EmptyState
    v-else
    compact
    icon="⚙"
    title="Settings"
    description="Settings now open in the main workbench area for better readability."
  />
</template>

<script setup lang="ts">
import {useActiveSidebarPanel} from '../../features/workspace/sidebar-panel-registry'
import {EmptyState} from '../../shared/ui'

const activePanel = useActiveSidebarPanel()
</script>
