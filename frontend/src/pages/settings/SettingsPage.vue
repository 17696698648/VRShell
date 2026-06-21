<template>
  <section class="settings-page">
    <header class="settings-page__header">
      <div>
        <h2>Settings</h2>
        <p>Preferences are routed through registered settings sections and feature actions.</p>
      </div>
    </header>

    <div class="settings-page__layout">
      <nav class="settings-page__nav" aria-label="Settings sections">
        <button v-for="section in sections" :key="section.id" :class="{active: activeSectionId === section.id}" type="button" @click="activeSectionId = section.id">
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
const activeSection = computed(() => sections.value.find((section) => section.id === activeSectionId.value) ?? sections.value[0] ?? null)

watchEffect(() => {
  if (!activeSection.value && sections.value[0]) activeSectionId.value = sections.value[0].id
})
</script>
