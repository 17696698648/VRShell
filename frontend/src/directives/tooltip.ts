import type { Directive, DirectiveBinding } from 'vue'

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

type TooltipValue = string | {
  text: string
  placement?: TooltipPlacement
  disabled?: boolean
}

function normalizeTooltip(value: TooltipValue | undefined) {
  if (!value) return null
  if (typeof value === 'string') return { text: value, placement: 'top' as TooltipPlacement, disabled: false }
  return { placement: 'top' as TooltipPlacement, disabled: false, ...value }
}

function applyTooltip(element: HTMLElement, binding: DirectiveBinding<TooltipValue>) {
  const tooltip = normalizeTooltip(binding.value)

  if (!tooltip || tooltip.disabled || !tooltip.text) {
    element.removeAttribute('data-tooltip')
    element.removeAttribute('data-tooltip-placement')
    return
  }

  element.setAttribute('data-tooltip', tooltip.text)
  element.setAttribute('data-tooltip-placement', tooltip.placement)
}

export const tooltipDirective: Directive<HTMLElement, TooltipValue> = {
  mounted: applyTooltip,
  updated: applyTooltip,
  beforeUnmount(element) {
    element.removeAttribute('data-tooltip')
    element.removeAttribute('data-tooltip-placement')
  },
}
