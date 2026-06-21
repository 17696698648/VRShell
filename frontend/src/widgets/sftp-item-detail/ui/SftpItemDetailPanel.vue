<template>
  <section class="sftp-item-detail-panel" aria-label="SFTP item details">
    <header><div><strong>SFTP Item</strong><small>{{ item?.name ?? 'No item selected' }}</small></div></header>
    <div v-if="item" class="sftp-item-detail-panel__content"><dl><div><dt>Name</dt><dd>{{ item.name }}</dd></div><div><dt>Type</dt><dd>{{ item.type }}</dd></div><div><dt>Path</dt><dd>{{ item.path }}</dd></div><div><dt>Size</dt><dd>{{ item.size }}</dd></div><div><dt>Modified</dt><dd>{{ item.modifiedAt }}</dd></div></dl></div>
    <EmptyState v-else compact icon="⇄" title="No SFTP item" description="Select a remote file or directory to inspect details." />
  </section>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import {sftpState} from '../../../entities/sftp'
import {EmptyState} from '../../../shared/ui'
const item = computed(() => sftpState.items.find((entry) => entry.id === sftpState.selectedItemId) ?? null)
</script>
