<template>
  <section class="search-page">
    <header class="search-page__header">
      <div>
        <h2>Search</h2>
        <p>Search sessions, terminals, SFTP paths, and commands from one workbench panel.</p>
      </div>
    </header>

    <label class="search-page__field">
      <span>Query</span>
      <input v-model="query" autofocus placeholder="Search workspace" />
    </label>

    <div class="search-page__scopes" aria-label="Search scopes">
      <button v-for="scope in scopes" :key="scope" :class="{active: activeScope === scope}" type="button" @click="activeScope = scope">
        {{ scope }}
      </button>
    </div>

    <EmptyState
      compact
      icon="⌕"
      :title="emptyTitle"
      description="The panel is reserved for the upcoming indexed search feature and already follows the shell panel boundary."
    />
  </section>
</template>

<script setup lang="ts">
import {EmptyState} from '../../../shared/ui'
import {useSearchPanel} from '../model/useSearchPanel'

const {activeScope, emptyTitle, query, scopes} = useSearchPanel()
</script>
