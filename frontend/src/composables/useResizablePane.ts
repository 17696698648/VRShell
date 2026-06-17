import { ref, type Ref } from 'vue'

export type ResizablePaneOptions = {
  initialSize: number
  minSize: number
  maxSize: number
  axis: 'x' | 'y'
  onResize?: () => void
  sizeRef?: Ref<number>
}

export function useResizablePane({ initialSize, minSize, maxSize, axis, onResize, sizeRef }: ResizablePaneOptions) {
  const size = sizeRef ?? ref(initialSize)

  function clampSize(value: number) {
    return Math.min(Math.max(value, minSize), maxSize)
  }

  function startResize(event: MouseEvent) {
    const startPosition = axis === 'x' ? event.clientX : event.clientY
    const startSize = size.value

    function onMouseMove(moveEvent: MouseEvent) {
      const currentPosition = axis === 'x' ? moveEvent.clientX : moveEvent.clientY
      size.value = clampSize(startSize + currentPosition - startPosition)
      onResize?.()
    }

    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return {
    size: size as Ref<number>,
    startResize,
  }
}
