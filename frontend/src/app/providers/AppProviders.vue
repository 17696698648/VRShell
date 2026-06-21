<template>
  <ThemeProvider>
    <ShortcutProvider>
      <IpcEventProvider>
        <PersistenceProvider>
          <ErrorBoundaryProvider>
            <slot />
          </ErrorBoundaryProvider>
        </PersistenceProvider>
      </IpcEventProvider>
    </ShortcutProvider>
  </ThemeProvider>
</template>

<script setup lang="ts">
import ErrorBoundaryProvider from './ErrorBoundaryProvider.vue'
import IpcEventProvider from './IpcEventProvider.vue'
import PersistenceProvider from './PersistenceProvider.vue'
import ShortcutProvider from './ShortcutProvider.vue'
import ThemeProvider from './ThemeProvider.vue'
</script>
