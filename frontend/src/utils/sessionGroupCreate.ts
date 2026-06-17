import type {SessionGroup} from '../components/SessionTreeGroup.vue'

export function createSessionGroup(options: {
  siblingGroups: SessionGroup[]
  baseName: string
  createUniqueGroupName: (siblingGroups: SessionGroup[], baseName: string) => string
  createGroupId: (name: string) => string
}): SessionGroup {
  const name = options.createUniqueGroupName(options.siblingGroups, options.baseName)
  const id = options.createGroupId(name)

  return {
    id,
    name,
    icon: '*',
    hosts: [],
    children: [],
  }
}

export function ensureRootSessionGroup(options: {
  sessionGroups: SessionGroup[]
  rootGroupId: string
  rootGroupName: string
}) {
  let rootGroup = options.sessionGroups.find((group) => group.id === options.rootGroupId)

  if (!rootGroup) {
    rootGroup = {
      id: options.rootGroupId,
      name: options.rootGroupName,
      icon: '*',
      hosts: [],
      children: [],
    }
    options.sessionGroups.unshift(rootGroup)
  }

  rootGroup.name = options.rootGroupName
  return rootGroup
}

export function appendNewSessionGroup(options: {
  parentGroup: SessionGroup
  expandedGroups: Record<string, boolean>
  createGroup: (siblingGroups: SessionGroup[], baseName: string) => SessionGroup
  baseName?: string
}) {
  const newGroup = options.createGroup(options.parentGroup.children, options.baseName ?? 'New Group')
  options.parentGroup.children.push(newGroup)
  options.expandedGroups[options.parentGroup.id] = true
  options.expandedGroups[newGroup.id] = true
  return newGroup
}

export function isLockedSessionGroup(groupId: string, lockedGroupId: string) {
  return groupId === lockedGroupId
}

export function renameSessionGroup(options: {
  groupId: string
  name: string
  lockedGroupId: string
  findGroup: (groupId: string) => SessionGroup | undefined
}) {
  if (isLockedSessionGroup(options.groupId, options.lockedGroupId)) {
    return false
  }

  const group = options.findGroup(options.groupId)
  if (group && options.name) {
    group.name = options.name
    return true
  }

  return false
}
