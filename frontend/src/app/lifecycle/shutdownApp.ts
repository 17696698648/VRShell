import {disposeGlobalEffects} from './registerGlobalEffects'

export function shutdownApp() {
  disposeGlobalEffects()
}
