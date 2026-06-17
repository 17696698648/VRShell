<template>
  <BaseDialog :visible="visible" :title="title" :message="message" width="380px" @close="emit('resolve', false)">
    <template #footer>
      <el-button @click="emit('resolve', false)">Cancel</el-button>
      <el-button type="danger" @click="emit('resolve', true)">Confirm</el-button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import {ElButton} from 'element-plus'
import BaseDialog from './BaseDialog.vue'

defineProps<{
  visible: boolean
  title: string
  message: string
}>()

const emit = defineEmits<{
  (event: 'resolve', value: boolean): void
}>()
</script>
