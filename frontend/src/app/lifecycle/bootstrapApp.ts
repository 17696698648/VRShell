import {applyInitialTheme} from '../../shared/theme/themeService'
import {registerGlobalEffects} from './registerGlobalEffects'
import {restoreAppState} from './restoreAppState'

export function bootstrapApp() {
  applyInitialTheme()
  restoreAppState()
  registerGlobalEffects()
}
