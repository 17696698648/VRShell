import {setCompactMode} from '../../entities/workspace'
import {registerDefaultDockPanels} from '../contributions/registerDefaultDockPanels'
import {registerDefaultOutputChannels} from '../contributions/registerDefaultOutputChannels'
import {registerDefaultRightSidebarPanels} from '../contributions/registerDefaultRightSidebarPanels'
import {registerDefaultSettingsSections} from '../contributions/registerDefaultSettingsSections'
import {registerDefaultSidebarPanels} from '../contributions/registerDefaultSidebarPanels'
import {registerDefaultStatusItems} from '../../shell/status-bar/model/registerDefaultStatusItems'

let disposeContributions: (() => void) | null = null
let disposeResponsiveMode: (() => void) | null = null

export function registerGlobalEffects() {
  disposeContributions?.()
  disposeResponsiveMode?.()
  const disposables = [
    registerDefaultStatusItems(),
    registerDefaultDockPanels(),
    registerDefaultSidebarPanels(),
    registerDefaultRightSidebarPanels(),
    registerDefaultSettingsSections(),
    registerDefaultOutputChannels(),
  ]
  disposeContributions = () => disposables.forEach((dispose) => dispose())
  disposeResponsiveMode = registerResponsiveMode()
}

export function disposeGlobalEffects() {
  disposeContributions?.()
  disposeResponsiveMode?.()
  disposeContributions = null
  disposeResponsiveMode = null
}

function registerResponsiveMode() {
  if (typeof window === 'undefined') return () => {}
  const update = () => setCompactMode(window.innerWidth < 1100)
  update()
  window.addEventListener('resize', update)
  return () => window.removeEventListener('resize', update)
}
