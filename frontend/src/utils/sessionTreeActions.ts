import type {ContextMenuType} from '../components/SessionTreeGroup.vue'

export function applySessionTreeAction(options: {
  targetType: ContextMenuType
  targetId: string
  action: string
  isLockedGroup: (groupId: string) => boolean
  resolveContextGroupId: (targetType: ContextMenuType, targetId: string) => string
  createChildGroup: (groupId: string) => void
  openCreateSessionDialog: (groupId: string) => void
  startGroupRename: (groupId: string) => void
  deleteGroup: (groupId: string) => void
  connectSession: (hostName: string) => void
  openEditSessionDialog: (hostName: string) => void
  deleteSession: (hostName: string) => void
}) {
  if (options.targetType === 'group') {
    if (options.action === 'create_group') {
      options.createChildGroup(options.targetId)
      return
    }

    if (options.action === 'create_session') {
      options.openCreateSessionDialog(options.targetId)
      return
    }

    if (options.action === 'rename') {
      if (!options.isLockedGroup(options.targetId)) {
        options.startGroupRename(options.targetId)
      }
      return
    }

    if (options.action === 'delete') {
      if (!options.isLockedGroup(options.targetId)) {
        options.deleteGroup(options.targetId)
      }
      return
    }
  }

  if (options.targetType === 'session') {
    if (options.action === 'connect') {
      options.connectSession(options.targetId)
      return
    }

    if (options.action === 'create_session') {
      options.openCreateSessionDialog(options.resolveContextGroupId(options.targetType, options.targetId))
      return
    }

    if (options.action === 'edit' || options.action === 'rename') {
      options.openEditSessionDialog(options.targetId)
      return
    }

    if (options.action === 'delete') {
      options.deleteSession(options.targetId)
    }
  }
}
