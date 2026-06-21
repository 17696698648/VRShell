<template>
  <section class="settings-page">
    <header class="settings-page__header">
      <div>
        <h2>Settings</h2>
        <p>Preferences are routed through registered settings sections and feature actions.</p>
      </div>
    </header>

    <label class="settings-page__search">
      <span>Search settings</span>
      <input v-model="settingsQuery" placeholder="Search sections, keywords, or fields" />
    </label>

    <div class="settings-page__layout">
      <nav class="settings-page__nav" aria-label="Settings sections">
        <button v-for="section in filteredSections" :key="section.id" :class="{active: activeSectionId === section.id}" type="button" @click="activeSectionId = section.id">
          {{ section.title }}
        </button>
      </nav>

      <div class="settings-page__content">
        <component v-if="activeSection" :is="activeSection.component" :title="activeSection.title" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {computed, ref, watchEffect} from 'vue'
import {useSettingsSections} from '../../features/settings/settings-registry'

const sections = useSettingsSections()
const activeSectionId = ref('Appearance')
const settingsQuery = ref('')
const filteredSections = computed(() => {
  const query = settingsQuery.value.trim().toLowerCase()
  if (!query) return sections.value
  return sections.value.filter((section) => [section.title, section.id, ...(section.keywords ?? [])].join(' ').toLowerCase().includes(query))
})
const activeSection = computed(() => filteredSections.value.find((section) => section.id === activeSectionId.value) ?? filteredSections.value[0] ?? null)

watchEffect(() => {
  if (!activeSection.value && filteredSections.value[0]) activeSectionId.value = filteredSections.value[0].id
})
</script>
