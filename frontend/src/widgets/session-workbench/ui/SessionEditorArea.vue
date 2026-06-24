<template>
  <section class="session-editor-area">
    <header class="session-editor-area__header">
      <strong>{{ activeFile?.title ?? 'No file selected' }}</strong>
      <small>{{ activeFile?.path ?? 'Open a file from this session to edit it here.' }}</small>
    </header>
    <pre class="session-editor-area__pane"><code>{{ activeFile?.content ?? '' }}</code></pre>
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {getSessionEditorFile} from '../../../entities/editor'

const props = defineProps<{sessionId: string}>()
const activeFile = computed(() => getSessionEditorFile(props.sessionId))
</script>
