<template>
  <label class="form-field" :class="[{ invalid, 'visually-hidden-label': hideLabel }, fieldClass]">
    <span>{{ label }}</span>
    <slot/>
    <small v-if="error" class="field-error">{{ error }}</small>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  error?: string
  invalid?: boolean
  hideLabel?: boolean
  fieldClass?: string
}>()
</script>

<style scoped>
.form-field {
  display: grid;
  grid-template-columns: 208px minmax(0, 1fr);
  gap: 8px 10px;
  align-items: center;
  color: #cbd5e1;
  font-size: 12px;
}

.form-field > span {
  color: #9fb0c5;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.form-field.visually-hidden-label > span {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.form-field .field-error {
  grid-column: 2;
}

.form-field.invalid :deep(.el-input__wrapper),
.form-field.invalid :deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px var(--status-danger) inset, 0 0 0 2px rgba(239, 68, 68, 0.12);
}

.form-field :deep(.el-input),
.form-field :deep(.el-select),
.form-field :deep(.el-input-number),
.form-field :deep(.el-textarea) {
  width: 100%;
}

.field-error {
  color: #fecaca;
  font-size: 10px;
  animation: field-error-in 0.2s ease;
}

@keyframes field-error-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
