<template>
  <section class="settings-section">
    <div><h3>Security</h3><p>High-risk settings should be explicit and auditable.</p></div>
    <p class="settings-warning" role="note">Security changes can affect saved hosts, keyring access, and audit behavior. Review carefully before applying.</p>
    <div class="settings-field"><UiSelect model-value="mask" label="Sensitive values" disabled :options="sensitiveValueOptions" /></div>
  </section>
</template>

<script setup lang="ts">
import {UiSelect, type UiSelectOption} from '../../../shared/ui'

const sensitiveValueOptions: UiSelectOption[] = [
  {label: 'Mask passwords and passphrases', value: 'mask'},
]
</script>
