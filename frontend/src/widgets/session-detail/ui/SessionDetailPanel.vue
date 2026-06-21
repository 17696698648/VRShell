<template>
  <section class="session-detail-panel" aria-label="Session details">
    <header>
      <div>
        <strong>Session Detail</strong>
        <small>{{ session?.name ?? 'No session selected' }}</small>
      </div>
    </header>
    <div v-if="session" class="session-detail-panel__content">
      <dl>
        <div><dt>Host</dt><dd>{{ session.host }}:{{ session.port }}</dd></div>
        <div><dt>User</dt><dd>{{ session.username }}</dd></div>
        <div><dt>Status</dt><dd>{{ session.status }}</dd></div>
        <div><dt>Protocol</dt><dd>{{ session.protocol }}</dd></div>
        <div><dt>Tags</dt><dd>{{ session.tags.join(', ') || '—' }}</dd></div>
      </dl>
    </div>
    <EmptyState v-else compact icon="SSH" title="No active session" description="Select a session to inspect connection details." />
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {getActiveSession} from '../../../entities/session'
import {EmptyState} from '../../../shared/ui'

const session = computed(() => getActiveSession())
</script>
