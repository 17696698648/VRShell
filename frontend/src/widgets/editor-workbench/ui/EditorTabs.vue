<template>
  <UiTabs class="editor-tabs" :active-id="tabs[0] ?? null" :items="tabItems" label="Editor tabs" @activate="noop" />
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {UiTabs, type UiTabItem} from '../../../shared/ui'

const props = defineProps<{tabs: string[]}>()
const tabItems = computed<UiTabItem[]>(() => props.tabs.map((tab) => ({id: tab, title: tab})))

function noop() {}
</script>
