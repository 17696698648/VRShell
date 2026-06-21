<template>
  <div class="editor-tabs"><button v-for="tab in tabs" :key="tab" type="button">{{ tab }}</button></div>
</template>

<script setup lang="ts">
defineProps<{tabs: string[]}>()
</script>
