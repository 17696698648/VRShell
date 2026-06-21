import {computed, reactive} from 'vue'
import type {StatusBarAlignment, StatusBarItem, StatusBarItemFactory} from './statusBar.types'

const statusItemFactories = reactive(new Map<string, StatusBarItemFactory>())

export function registerStatusBarItem(id: string, factory: StatusBarItemFactory) {
  statusItemFactories.set(id, factory)
  return () => statusItemFactories.delete(id)
}

export function clearStatusBarItems() {
  statusItemFactories.clear()
}

export function useStatusBarItems(align: StatusBarAlignment) {
  return computed(() =>
    Array.from(statusItemFactories.values())
      .map((factory) => factory())
      .filter((item): item is StatusBarItem => item !== null)
      .filter((item) => item.align === align)
      .sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100)),
  )
}
