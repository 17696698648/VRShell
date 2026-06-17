<template>
  <div class="form-field-group" :class="{ paired }">
    <slot/>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  paired?: boolean
}>()
</script>

<style scoped>
.form-field-group {
  display: flex;
  gap: 12px;
}

.form-field-group :deep(.form-field) {
  flex: 1;
}

.form-field-group.paired {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(108px, 0.42fr);
}

.form-field-group.paired :deep(.form-field:first-child) {
  grid-template-columns: 208px minmax(0, 1fr);
}

.form-field-group.paired :deep(.form-field:not(:first-child)) {
  grid-template-columns: minmax(0, 1fr);
}

.form-field-group.paired :deep(.form-field:not(:first-child) .field-error) {
  grid-column: 1;
}
</style>
