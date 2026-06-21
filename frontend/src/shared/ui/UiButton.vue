<template>
  <button
    class="ui-button"
    :class="[variant, size, {loading}]"
    type="button"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="ui-button__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    disabled?: boolean
    loading?: boolean
    size?: 'sm' | 'md'
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  }>(),
  {disabled: false, loading: false, size: 'md', variant: 'ghost'},
)
</script>
