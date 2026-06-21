import {workspaceState, type WorkspaceDensity} from '../../../entities/workspace'

export function switchDensity(density: WorkspaceDensity) {
  workspaceState.density = density
}
