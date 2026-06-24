<template>
  <section class="session-pane" :class="{'session-pane--editor-open': editorOpen}">
    <div class="session-split-view" :class="{'session-split-view--editor-open': editorOpen}">
      <section class="session-split-view__terminal" aria-label="Session terminals">
        <slot name="terminal" />
      </section>
      <section v-if="editorOpen" class="session-split-view__editor" aria-label="Session editor">
        <slot name="editor" />
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{editorOpen: boolean}>()
</script>
