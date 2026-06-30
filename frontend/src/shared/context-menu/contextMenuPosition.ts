export interface ContextMenuPositionInput {
  menuHeight: number
  menuWidth: number
  requestedX: number
  requestedY: number
  viewportHeight: number
  viewportWidth: number
  viewportMargin?: number
}

export function getContextMenuPosition(input: ContextMenuPositionInput) {
  const margin = input.viewportMargin ?? 8
  const maxLeft = Math.max(margin, input.viewportWidth - input.menuWidth - margin)
  const maxTop = Math.max(margin, input.viewportHeight - input.menuHeight - margin)
  return {
    left: clamp(input.requestedX, margin, maxLeft),
    top: clamp(input.requestedY, margin, maxTop),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
