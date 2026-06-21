import {workspaceState, type WorkspaceMainView} from '../../../entities/workspace'

export function switchMainView(view: WorkspaceMainView) {
  workspaceState.activeMainView = view
}
