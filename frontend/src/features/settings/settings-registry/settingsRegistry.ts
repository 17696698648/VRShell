import {computed, reactive} from 'vue'
import type {SettingsSectionRegistration} from './settingsSection.types'

const settingsSections = reactive(new Map<string, SettingsSectionRegistration>())

export function registerSettingsSection(section: SettingsSectionRegistration) {
  settingsSections.set(section.id, section)
  return () => settingsSections.delete(section.id)
}

export function useSettingsSections() {
  return computed(() => Array.from(settingsSections.values()).sort((left, right) => (left.order ?? 100) - (right.order ?? 100)))
}
