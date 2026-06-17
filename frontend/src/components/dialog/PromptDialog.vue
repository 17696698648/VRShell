<template>
  <BaseDialog :visible="visible" :title="title" :message="message" width="400px" @close="emit('cancel')">
    <div class="prompt-input-wrap">
      <el-input
          :model-value="modelValue"
          :type="inputType"
          :placeholder="placeholder"
          :show-password="inputType === 'password'"
          @input="emit('update:modelValue', $event)"
          @keydown.enter="emit('confirm')"
      />
      <small v-if="validationError" class="prompt-error">{{ validationError }}</small>
    </div>
    <template #footer>
      <el-button @click="emit('cancel')">Cancel</el-button>
      <el-button type="primary" @click="emit('confirm')">OK</el-button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import {ElButton, ElInput} from 'element-plus'
import BaseDialog from './BaseDialog.vue'

defineProps<{
  visible: boolean
  title: string
  message?: string
  modelValue?: string
  placeholder?: string
  inputType?: 'text' | 'password'
  validationError?: string | null
}>()

const emit = defineEmits<{
  (event: 'confirm'): void
  (event: 'cancel'): void
  (event: 'update:modelValue', value: string): void
}>()
</script>

<style scoped>
.prompt-input-wrap {
  display: grid;
  gap: 6px;
}

.prompt-error {
  color: #f87171;
  font-size: 12px;
}
</style>
