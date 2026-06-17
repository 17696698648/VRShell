<template>
  <FormField label="Auth method">
    <el-select :model-value="authMethod" @change="emit('update-field', 'authMethod', $event)">
      <el-option label="Password" value="password"/>
      <el-option label="Key" value="key"/>
    </el-select>
  </FormField>

  <FormFieldGroup paired>
    <el-form-item prop="user">
      <FormField label="User/Password" :error="userError" :invalid="Boolean(userError)">
        <el-input :model-value="user" placeholder="root" @blur="emit('validate-user')"
                  @input="updateUser"/>
      </FormField>
    </el-form-item>
    <FormField v-if="authMethod === 'password'" label="Password" hide-label>
      <el-input :model-value="password" type="password" placeholder="Enter password" show-password
                @input="emit('update-field', 'password', $event)"/>
    </FormField>
    <FormField v-else label="Private key" hide-label>
      <div class="inline-file-field">
        <el-input :model-value="privateKeyPath" placeholder="Private key path"
                  @input="emit('update-field', 'privateKeyPath', $event)"/>
        <el-button type="primary" plain @click="emit('choose-private-key')">Browse</el-button>
      </div>
    </FormField>
  </FormFieldGroup>

  <FormField v-if="authMethod === 'key'" label="Key passphrase">
    <el-input :model-value="passphrase" type="password" placeholder="Optional passphrase" show-password
              @input="emit('update-field', 'passphrase', $event)"/>
  </FormField>
</template>

<script setup lang="ts">
import {ElButton, ElFormItem, ElInput, ElOption, ElSelect} from 'element-plus'
import FormField from '../form/FormField.vue'
import FormFieldGroup from '../form/FormFieldGroup.vue'

defineProps<{
  authMethod: string
  user: string
  password: string
  privateKeyPath: string
  passphrase: string
  userError?: string
}>()

const emit = defineEmits<{
  (event: 'update-field', field: 'authMethod' | 'user' | 'password' | 'privateKeyPath' | 'passphrase', value: string | number): void
  (event: 'clear-user-error'): void
  (event: 'validate-user'): void
  (event: 'choose-private-key'): void
}>()

function updateUser(value: string) {
  emit('update-field', 'user', value)
  emit('clear-user-error')
}
</script>

<style scoped>
.inline-file-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
}

.inline-file-field :deep(.el-button) {
  min-height: 36px;
}
</style>
