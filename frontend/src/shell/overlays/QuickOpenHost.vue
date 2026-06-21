<template>
  <div v-if="workspaceState.quickOpenOpen" class="overlay" @click.self="closeQuickOpen">
    <section class="command-palette quick-open">
      <input v-model="query" autofocus placeholder="Open session or terminal" @keydown.escape="closeQuickOpen" />
      <div class="command-palette__list">
        <button v-for="item in filteredItems" :key="item.id" type="button" @click="activateQuickOpenItem(item)">
          <span>{{ item.label }}</span>
          <small>{{ item.kind }}</small>
          <kbd>{{ item.detail }}</kbd>
        </button>
      </div>
      <p v-if="filteredItems.length === 0">No sessions or terminals found.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {sessionState} from '../../entities/session'
import {terminalState} from '../../entities/terminal'
import {workspaceState} from '../../entities/workspace'
import {activateQuickOpenItem, closeQuickOpen, getQuickOpenItems} from '../../features/workspace/quick-open/quickOpen'

const query = ref('')
const items = computed(() => getQuickOpenItems(sessionState.sessions, terminalState.tabs))
const filteredItems = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return items.value
  return items.value.filter((item) => `${item.label} ${item.detail} ${item.kind}`.toLowerCase().includes(keyword))
})
</script>
