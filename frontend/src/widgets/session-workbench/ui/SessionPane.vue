<template>
  <section class="session-pane" :class="{'session-pane--editor-open': editorOpen}">
    <UiSplitPane
      v-if="editorOpen"
      class="session-split-view session-split-view--editor-open"
      direction="vertical"
      :model-value="splitRatio"
      :min="24"
      :max="72"
      first-pane-class="session-split-view__editor"
      second-pane-class="session-split-view__terminal"
      @update:model-value="updateSplitRatio"
      @resize-end="updateSplitRatio"
    >
      <template #first>
        <slot name="editor" />
      </template>
      <template #second>
        <slot name="terminal" />
      </template>
    </UiSplitPane>
    <section v-else class="session-split-view__terminal" aria-label="Session terminals">
      <slot name="terminal" />
    </section>
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {getSessionEditorSplitRatio, setSessionEditorSplitRatio} from '../../../entities/editor'
import {UiSplitPane} from '../../../shared/ui'

const props = defineProps<{editorOpen: boolean; sessionId: string}>()
const splitRatio = computed(() => props.sessionId ? getSessionEditorSplitRatio(props.sessionId) : 42)

function updateSplitRatio(value: number) {
  if (props.sessionId) setSessionEditorSplitRatio(props.sessionId, value)
}
</script>
