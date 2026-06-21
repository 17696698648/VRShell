<template>
  <header class="panel__header">
    <div>
      <strong>Sessions</strong>
      <small>SSH inventory</small>
    </div>
    <div class="panel__actions">
      <button type="button" @click="$emit('createGroup')">Group</button>
      <button type="button" @click="$emit('importSshConfig')">Import</button>
      <button type="button" @click="$emit('create')">{{ formOpen ? 'Close' : 'New' }}</button>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{formOpen: boolean}>()
defineEmits<{create: []; createGroup: []; importSshConfig: []}>()
</script>
