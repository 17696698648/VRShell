<template>
  <kbd class="ui-kbd"><slot>{{ label }}</slot></kbd>
</template>

<script setup lang="ts">
withDefaults(defineProps<{label?: string}>(), {label: ''})
</script>
