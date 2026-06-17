import type { SessionGroup, SessionHost } from '../components/SessionTreeGroup.vue'

export function walkGroups(groups: SessionGroup[], visitor: (group: SessionGroup) => void) {
  groups.forEach((group) => {
    visitor(group)
    walkGroups(group.children, visitor)
  })
}

export function findGroupListLocation(groupId: string, groups: SessionGroup[]): { groups: SessionGroup[]; index: number } | null {
  const index = groups.findIndex((group) => group.id === groupId)

  if (index >= 0) {
    return { groups, index }
  }

  for (const group of groups) {
    const childLocation = findGroupListLocation(groupId, group.children)
    if (childLocation) {
      return childLocation
    }
  }

  return null
}

export function findHostListLocation(hostName: string, groups: SessionGroup[]): { group: SessionGroup; hosts: SessionHost[]; index: number } | null {
  for (const group of groups) {
    const index = group.hosts.findIndex((host) => host.name === hostName)

    if (index >= 0) {
      return { group, hosts: group.hosts, index }
    }

    const childLocation = findHostListLocation(hostName, group.children)
    if (childLocation) {
      return childLocation
    }
  }

  return null
}

export function findGroupInList(groupId: string, groups: SessionGroup[]): SessionGroup | null {
  for (const group of groups) {
    if (group.id === groupId) {
      return group
    }

    const childGroup = findGroupInList(groupId, group.children)
    if (childGroup) {
      return childGroup
    }
  }

  return null
}

export function findGroup(groupId: string, groups: SessionGroup[]) {
  let matchedGroup: SessionGroup | undefined
  walkGroups(groups, (group) => {
    if (group.id === groupId) {
      matchedGroup = group
    }
  })
  return matchedGroup
}

export function findGroupPath(groupId: string, groups: SessionGroup[], path: string[] = []): string[] {
  for (const group of groups) {
    const nextPath = [...path, group.id]
    if (group.id === groupId) {
      return nextPath
    }

    const childPath = findGroupPath(groupId, group.children, nextPath)
    if (childPath.length > 0) {
      return childPath
    }
  }

  return []
}

export function findHostLocation(hostName: string, groups: SessionGroup[]) {
  let matchedLocation: { host: SessionHost; group: SessionGroup } | undefined
  walkGroups(groups, (group) => {
    const host = group.hosts.find((item) => item.name === hostName)

    if (host) {
      matchedLocation = { host, group }
    }
  })
  return matchedLocation
}

export function findHost(hostName: string, groups: SessionGroup[]) {
  return findHostLocation(hostName, groups)?.host
}

export function findFirstHost(groups: SessionGroup[]) {
  let matchedHost: SessionHost | undefined
  walkGroups(groups, (group) => {
    if (!matchedHost && group.hosts.length > 0) {
      matchedHost = group.hosts[0]
    }
  })
  return matchedHost
}

export function findActiveHost(groups: SessionGroup[]) {
  let matchedHost: SessionHost | undefined
  walkGroups(groups, (group) => {
    if (!matchedHost) {
      matchedHost = group.hosts.find((host) => host.active)
    }
  })
  return matchedHost
}

export function hasActiveHost(group: SessionGroup): boolean {
  return group.hosts.some((host) => host.active) || group.children.some((child) => hasActiveHost(child))
}

export function removeGroupFromList(groups: SessionGroup[], groupId: string): boolean {
  const groupIndex = groups.findIndex((group) => group.id === groupId)

  if (groupIndex >= 0) {
    groups.splice(groupIndex, 1)
    return true
  }

  return groups.some((group) => removeGroupFromList(group.children, groupId))
}

export function createUniqueGroupName(siblingGroups: SessionGroup[], baseName: string) {
  const siblingNames = new Set(siblingGroups.map((group) => group.name))

  if (!siblingNames.has(baseName)) {
    return baseName
  }

  let index = 2
  let nextName = baseName + ' ' + index

  while (siblingNames.has(nextName)) {
    index += 1
    nextName = baseName + ' ' + index
  }

  return nextName
}

export function createUniqueHostName(groups: SessionGroup[], baseName: string, ignoredName = '') {
  const hostNames = new Set<string>()
  walkGroups(groups, (group) => {
    group.hosts.forEach((host) => {
      if (host.name !== ignoredName) {
        hostNames.add(host.name)
      }
    })
  })

  if (!hostNames.has(baseName)) {
    return baseName
  }

  let index = 2
  let nextName = baseName + '-' + index

  while (hostNames.has(nextName)) {
    index += 1
    nextName = baseName + '-' + index
  }

  return nextName
}

export function createGroupId(groups: SessionGroup[], name: string) {
  const groupIds = new Set<string>()
  walkGroups(groups, (group) => groupIds.add(group.id))

  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const baseId = normalizedName || 'group'

  if (!groupIds.has(baseId)) {
    return baseId
  }

  let index = 2
  let nextId = baseId + '-' + index

  while (groupIds.has(nextId)) {
    index += 1
    nextId = baseId + '-' + index
  }

  return nextId
}

export function countHosts(group: SessionGroup): number {
  return group.hosts.length + group.children.reduce((total, child) => total + countHosts(child), 0)
}

export function countGroups(groups: SessionGroup[]): number {
  return groups.reduce((total, group) => total + 1 + countGroups(group.children), 0)
}

export function flattenHosts(groups: SessionGroup[]): SessionHost[] {
  return groups.flatMap((group) => [...group.hosts, ...flattenHosts(group.children)])
}
