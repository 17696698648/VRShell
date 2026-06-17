/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Minimal ambient module declarations for Tauri API (silence TS in editor when node_modules aren't installed)
declare module '@tauri-apps/api/core' {
  export function invoke<T = any>(cmd: string, args?: any): Promise<T>
}

declare module '@tauri-apps/api/event' {
  export function listen(event: string, handler: (e: any) => void): Promise<() => void>
}

