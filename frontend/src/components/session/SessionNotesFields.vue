<template>
  <FormField label="Remark">
    <el-input :model-value="remark" type="textarea" :rows="3"
              placeholder="Purpose, environment, or jump host notes" resize="vertical"
              @input="emit('update', $event)"/>
  </FormField>
</template>

<script setup lang="ts">
import {ElInput} from 'element-plus'
import FormField from '../form/FormField.vue'

defineProps<{
  remark: string
}>()

const emit = defineEmits<{
  (event: 'update', value: string): void
}>()
</script>
