<template>
  <button
    class="ui-button"
    :class="[variant, size, {loading}]"
    :type="type"
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
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  }>(),
  {disabled: false, loading: false, size: 'md', type: 'button', variant: 'ghost'},
)
</script>
