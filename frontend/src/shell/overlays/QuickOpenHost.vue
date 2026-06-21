<template>
  <div v-if="workspaceState.quickOpenOpen" class="overlay" @click.self="closeQuickOpen">
    <section class="command-palette quick-open" role="dialog" aria-label="Quick switcher">
      <label class="command-palette__input">
        <span aria-hidden="true">⌕</span>
        <input v-model="query" autofocus placeholder="Switch session or terminal by name, host, tag, or cwd" @keydown.enter.prevent="openFirstItem" @keydown.escape="closeQuickOpen" />
      </label>
      <div v-if="groups.length > 0" class="command-palette__list quick-open__list">
        <section v-for="group in groups" :key="group.kind" class="command-palette__group">
          <h3>{{ group.kind }} <small>{{ group.items.length }}</small></h3>
          <button v-for="item in group.items" :key="item.id" type="button" @click="activateQuickOpenItem(item)">
            <span class="command-palette__icon" aria-hidden="true">{{ item.kind === 'terminal' ? 'T' : 'S' }}</span>
            <span>
              <strong>{{ item.label }}</strong>
              <small>{{ item.detail }}</small>
            </span>
            <small class="command-palette__category">{{ item.kind }}</small>
            <kbd>{{ item.status }}</kbd>
          </button>
        </section>
      </div>
      <EmptyState v-else compact icon="⌕" title="No sessions or terminals found" description="Try searching by host, tag, terminal title, or current directory." />
    </section>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {sessionState} from '../../entities/session'
import {terminalState} from '../../entities/terminal'
import {workspaceState} from '../../entities/workspace'
import {activateQuickOpenItem, closeQuickOpen, getQuickOpenItems} from '../../features/workspace/quick-open/quickOpen'
import {EmptyState} from '../../shared/ui'

const query = ref('')
const items = computed(() => getQuickOpenItems(sessionState.sessions, terminalState.tabs))
const filteredItems = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return items.value
  return items.value.filter((item) => `${item.label} ${item.detail} ${item.kind} ${item.status}`.toLowerCase().includes(keyword))
})
const groups = computed(() => {
  const kinds = ['terminal', 'session'] as const
  return kinds.map((kind) => ({kind, items: filteredItems.value.filter((item) => item.kind === kind)})).filter((group) => group.items.length > 0)
})

function openFirstItem() {
  const [firstItem] = filteredItems.value
  if (firstItem) activateQuickOpenItem(firstItem)
}
</script>
