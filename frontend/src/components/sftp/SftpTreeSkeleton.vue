<template>
  <div class="skeleton-list">
    <div
      v-for="i in count"
      :key="i"
      class="skeleton-row"
      :style="{ animationDelay: `${i * 60}ms` }"
    >
      <div class="skeleton-icon"></div>
      <div class="skeleton-text" :style="{ width: `${45 + Math.floor((i * 7) % 35)}%` }"></div>
      <div class="skeleton-meta" :style="{ width: `${25 + Math.floor((i * 5) % 20)}%` }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  count?: number
}>()
</script>

<style scoped>
.skeleton-list {
  display: grid;
  gap: 1px;
  padding: 0 4px;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  animation: skeleton-pulse 1.6s ease-in-out infinite;
}

.skeleton-icon {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.1);
}

.skeleton-text {
  flex: 1 1 auto;
  height: 11px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.08);
}

.skeleton-meta {
  flex: 0 1 auto;
  height: 9px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.06);
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>
