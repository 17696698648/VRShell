<template>
  <Transition name="overlay-fade">
    <div v-if="workspaceState.quickOpenOpen" class="overlay overlay--quick-open" @click.self="closeQuickOpen">
    <section class="quick-open" role="dialog" aria-label="Quick switcher">
      <label class="quick-open__search">
        <span aria-hidden="true">Search</span>
        <input
          v-model="query"
          autofocus
          role="combobox"
          aria-autocomplete="list"
          aria-controls="quick-open-listbox"
          :aria-activedescendant="selectedItem ? optionId(selectedItem.id) : undefined"
          :aria-expanded="workspaceState.quickOpenOpen"
          placeholder="Switch session or terminal by name, host, #tag, favorite, or cwd"
          @keydown.enter.prevent="openSelectedItem"
          @keydown.escape="closeQuickOpen"
          @keydown.up.prevent="navigateUp"
          @keydown.down.prevent="navigateDown"
        />
      </label>
      <div v-if="groups.length > 0" id="quick-open-listbox" ref="listRef" class="quick-open__list" role="listbox">
        <section v-for="group in groups" :key="group.kind" class="quick-open__group">
          <button
            v-for="item in group.items"
            :id="optionId(item.id)"
            :key="item.id"
            :ref="(el) => setButtonRef(item.id, el as HTMLElement)"
            :class="{selected: isSelected(item.id)}"
            :aria-selected="isSelected(item.id)"
            role="option"
            type="button"
            @click="activateQuickOpenItem(item)"
            @mouseenter="selectedIndex = flatIndex(item.id)"
          >
            <strong v-html="highlightMatch(item.label)" />
            <small v-html="highlightMatch(itemAddress(item))" />
            <small class="quick-open__kind">{{ item.kind }}</small>
          </button>
        </section>
      </div>
      <EmptyState v-else compact icon="Search" title="No sessions or terminals found" description="Try searching by host, tag, terminal title, or current directory." />
    </section>
  </div>
  </Transition>
</template>

<script setup lang="ts">
import {nextTick, ref} from 'vue'
import {sessionState} from '../../entities/session'
import {terminalState} from '../../entities/terminal'
import {workspaceState} from '../../entities/workspace'
import {activateQuickOpenItem, closeQuickOpen} from '../../features/workspace/quick-open/quickOpen'
import {highlightQuickOpenMatch, itemAddress, optionId, useQuickOpenState} from '../../features/workspace/quick-open/useQuickOpenState'
import {EmptyState} from '../../shared/ui'

const listRef = ref<HTMLElement | null>(null)
const buttonRefs = new Map<string, HTMLElement>()
const {filteredItems, flatIndex, groups, isSelected, navigateDown: moveDown, navigateUp: moveUp, query, selectedIndex, selectedItem} = useQuickOpenState(() => sessionState.sessions, () => terminalState.tabs)

function setButtonRef(id: string, el: HTMLElement | null) {
  if (el) buttonRefs.set(id, el)
  else buttonRefs.delete(id)
}

function navigateUp() {
  moveUp()
  scrollSelectedIntoView()
}

function navigateDown() {
  moveDown()
  scrollSelectedIntoView()
}

function scrollSelectedIntoView() {
  const item = selectedItem.value
  if (!item) return
  void nextTick(() => {
    const el = buttonRefs.get(item.id)
    el?.scrollIntoView({block: 'nearest'})
  })
}

function openSelectedItem() {
  const selected = selectedItem.value
  if (selected) activateQuickOpenItem(selected)
}

function highlightMatch(text: string) {
  return highlightQuickOpenMatch(text, query.value)
}
</script>
