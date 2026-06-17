import type {
  GroupDropPosition,
  HostDropPosition,
  SessionGroup,
  SessionHost,
} from '../components/SessionTreeGroup.vue'

type GroupLocation = { groups: SessionGroup[]; index: number }
type HostLocation = { group: SessionGroup; hosts: SessionHost[]; index: number }

export function moveGroupByDrop(options: {
  sourceGroupId: string
  targetGroupId: string
  position: GroupDropPosition
  isLockedGroup: (groupId: string) => boolean
  isDescendantGroup: (parentGroupId: string, childGroupId: string) => boolean
  findGroup: (groupId: string) => SessionGroup | undefined
  findGroupListLocation: (groupId: string) => GroupLocation | null
  expandedGroups: Record<string, boolean>
  persistSessionTree: () => void
}) {
  if (
    options.isLockedGroup(options.sourceGroupId) ||
    options.isLockedGroup(options.targetGroupId) ||
    options.sourceGroupId === options.targetGroupId
  ) {
    return false
  }

  const sourceLocation = options.findGroupListLocation(options.sourceGroupId)
  const targetLocation = options.findGroupListLocation(options.targetGroupId)

  if (!sourceLocation || !targetLocation || options.isDescendantGroup(options.sourceGroupId, options.targetGroupId)) {
    return false
  }

  const [sourceGroup] = sourceLocation.groups.splice(sourceLocation.index, 1)
  const refreshedTargetLocation = options.findGroupListLocation(options.targetGroupId)

  if (!sourceGroup || !refreshedTargetLocation) {
    return false
  }

  if (options.position === 'inside') {
    const targetGroup = options.findGroup(options.targetGroupId)
    if (targetGroup) {
      targetGroup.children.push(sourceGroup)
      options.expandedGroups[targetGroup.id] = true
      options.persistSessionTree()
      return true
    }

    return false
  }

  const insertOffset = options.position === 'after' ? 1 : 0
  refreshedTargetLocation.groups.splice(refreshedTargetLocation.index + insertOffset, 0, sourceGroup)
  options.persistSessionTree()
  return true
}

export function moveHostByDrop(options: {
  sourceHostName: string
  targetHostName: string
  position: HostDropPosition
  findHostListLocation: (hostName: string) => HostLocation | null
  persistSessionTree: () => void
}) {
  if (options.sourceHostName === options.targetHostName) {
    return false
  }

  const sourceLocation = options.findHostListLocation(options.sourceHostName)
  const targetLocation = options.findHostListLocation(options.targetHostName)

  if (!sourceLocation || !targetLocation) {
    return false
  }

  const [sourceHost] = sourceLocation.hosts.splice(sourceLocation.index, 1)
  const refreshedTargetLocation = options.findHostListLocation(options.targetHostName)

  if (!sourceHost || !refreshedTargetLocation) {
    return false
  }

  const insertOffset = options.position === 'after' ? 1 : 0
  refreshedTargetLocation.hosts.splice(refreshedTargetLocation.index + insertOffset, 0, sourceHost)
  options.persistSessionTree()
  return true
}

export function moveHostToGroupEnd(options: {
  sourceHostName: string
  targetGroupId: string
  findHostListLocation: (hostName: string) => HostLocation | null
  findGroup: (groupId: string) => SessionGroup | undefined
  expandedGroups: Record<string, boolean>
  persistSessionTree: () => void
}) {
  if (!options.sourceHostName) {
    return false
  }

  const sourceLocation = options.findHostListLocation(options.sourceHostName)
  const targetGroup = options.findGroup(options.targetGroupId)

  if (!sourceLocation || !targetGroup) {
    return false
  }

  const [sourceHost] = sourceLocation.hosts.splice(sourceLocation.index, 1)
  if (!sourceHost) {
    return false
  }

  targetGroup.hosts.push(sourceHost)
  options.expandedGroups[targetGroup.id] = true
  options.persistSessionTree()
  return true
}
