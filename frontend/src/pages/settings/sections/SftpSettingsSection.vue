<template>
  <section class="settings-section">
    <div><h3>SFTP</h3><p>Transfer behavior is shared by SFTP Explorer, Task Queue, and command actions.</p></div>
    <div class="settings-field"><UiSelect model-value="2" label="Transfer concurrency" disabled description="Reserved for the transfer queue implementation." :options="concurrencyOptions" /></div>
    <div class="settings-field"><UiSelect model-value="ask" label="Overwrite policy" disabled :options="overwriteOptions" /></div>
  </section>
</template>

<script setup lang="ts">
import {UiSelect, type UiSelectOption} from '../../../shared/ui'

const concurrencyOptions: UiSelectOption[] = [
  {label: '2 parallel transfers', value: '2'},
  {label: '4 parallel transfers', value: '4'},
]
const overwriteOptions: UiSelectOption[] = [
  {label: 'Ask every time', value: 'ask'},
  {label: 'Overwrite newer', value: 'overwrite-newer'},
  {label: 'Skip existing', value: 'skip'},
]
</script>
