<template>
  <section class="settings-section">
    <div><h3>Terminal</h3><p>Terminal rendering is isolated from Vue reactivity for high-frequency output.</p></div>
    <div class="settings-field"><UiInput model-value="Cascadia Mono, JetBrains Mono, Consolas" label="Font family" disabled /></div>
    <div class="settings-field"><UiSelect model-value="block" label="Cursor" disabled :options="cursorOptions" /></div>
    <div class="settings-field"><UiSelect model-value="default" label="Terminal profile" disabled description="Profiles will control shell, env, scrollback, and cursor style." :options="profileOptions" /></div>
  </section>
</template>

<script setup lang="ts">
import {UiInput, UiSelect, type UiSelectOption} from '../../../shared/ui'

const cursorOptions: UiSelectOption[] = [
  {label: 'Block', value: 'block'},
  {label: 'Bar', value: 'bar'},
  {label: 'Underline', value: 'underline'},
]
const profileOptions: UiSelectOption[] = [
  {label: 'Default SSH shell', value: 'default'},
  {label: 'Login shell with keepalive', value: 'keepalive'},
]
</script>
