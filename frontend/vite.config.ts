import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: './',
  plugins: [
    vue(),
  ],
  optimizeDeps: {
    include: ['@tauri-apps/api', '@tauri-apps/api/tauri', '@tauri-apps/api/event', '@tauri-apps/api/core']
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      external: [],
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@codemirror') || id.includes('node_modules/codemirror')) {
            return 'codemirror';
          }

          if (id.includes('node_modules/element-plus')) {
            return 'element-plus';
          }

          if (id.includes('node_modules/xterm')) {
            return 'xterm';
          }

          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
});
