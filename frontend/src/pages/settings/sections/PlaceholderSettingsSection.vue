<template>
  <section class="settings-section">
    <EmptyState compact icon="⚙" :title="`${title} settings`" description="This settings group is reserved for the next implementation milestone." />
  </section>
</template>
<script setup lang="ts">
import {EmptyState} from '../../../shared/ui'
defineProps<{title: string}>()
</script>
