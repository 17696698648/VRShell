import type {Component} from 'vue'

export interface SettingsSectionRegistration {
  id: string
  title: string
  order?: number
  component: Component
}
