<template>
  <section class="editor-workbench">
    <EditorTabs :tabs="tabs" />
    <CodeEditor />
  </section>
</template>

<script setup lang="ts">
import {useEditorWorkbench} from '../model/useEditorWorkbench'
import CodeEditor from './CodeEditor.vue'
import EditorTabs from './EditorTabs.vue'

const {tabs} = useEditorWorkbench()
</script>
