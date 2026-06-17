<template>
  <FormFieldGroup>
    <FormField label="Auto‑reconnect" field-class="toggle-field">
      <el-switch :model-value="autoReconnect"
                 @change="emit('update-field', 'autoReconnect', Boolean($event))"/>
    </FormField>

    <FormField label="Hash known hosts" field-class="toggle-field">
      <el-switch :model-value="hashKnownHosts"
                 @change="emit('update-field', 'hashKnownHosts', Boolean($event))"/>
    </FormField>
  </FormFieldGroup>

  <FormField label="Idle timeout">
    <el-select :model-value="idleTimeoutSecs"
               @change="emit('update-field', 'idleTimeoutSecs', Number($event))">
      <el-option label="None" :value="0"/>
      <el-option label="5 min" :value="300"/>
      <el-option label="15 min" :value="900"/>
      <el-option label="30 min" :value="1800"/>
      <el-option label="1 hour" :value="3600"/>
    </el-select>
  </FormField>

  <FormField v-if="identityFile" label="Identity file" field-class="hint-field">
    <span class="hint-text">Auto‑detected: {{ identityFile }}</span>
  </FormField>
</template>

<script setup lang="ts">
import {ElOption, ElSelect, ElSwitch} from 'element-plus'
import FormField from '../form/FormField.vue'
import FormFieldGroup from '../form/FormFieldGroup.vue'

defineProps<{
  autoReconnect: boolean
  hashKnownHosts: boolean
  idleTimeoutSecs: number
  identityFile: string
}>()

const emit = defineEmits<{
  (event: 'update-field', field: 'autoReconnect' | 'hashKnownHosts' | 'idleTimeoutSecs', value: boolean | number): void
}>()
</script>

<style scoped>
:deep(.toggle-field) {
  grid-template-columns: 1fr auto;
}

:deep(.hint-field) {
  grid-template-columns: 208px minmax(0, 1fr);
}

.hint-text {
  padding: 6px 0;
  color: #7f8ea3;
  font-size: 11px;
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
