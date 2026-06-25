<template>
  <aside v-if="activeDockPanel" class="right-tool-window" :style="toolWindowStyle">
    <button class="right-tool-window__handle" type="button" aria-label="Resize right tool window" @pointerdown="startResize" />
    <component :is="activeDockPanel.component" />
  </aside>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {setRightDockWidth, workspaceState} from '../../entities/workspace'
import {useRightDockPanel} from '../../features/workspace/dock-registry'

const activeDockPanel = useRightDockPanel()
const resizingWidth = ref<number | null>(null)
const toolWindowStyle = computed(() => ({width: `${resizingWidth.value ?? workspaceState.rightDockWidth}px`}))

function startResize(event: PointerEvent) {
  event.preventDefault()
  const startX = event.clientX
  const startWidth = workspaceState.rightDockWidth
  document.body.classList.add('is-resizing')

  function move(pointerEvent: PointerEvent) {
    resizingWidth.value = clampRightDockWidth(startWidth - (pointerEvent.clientX - startX))
    document.body.style.setProperty('--resize-guide-x', `${pointerEvent.clientX}px`)
  }

  function end(pointerEvent: PointerEvent) {
    move(pointerEvent)
    if (resizingWidth.value !== null) setRightDockWidth(resizingWidth.value)
    resizingWidth.value = null
    document.body.classList.remove('is-resizing')
    document.body.style.removeProperty('--resize-guide-x')
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}

function clampRightDockWidth(width: number) {
  return Math.min(520, Math.max(260, Math.round(width)))
}
</script>
