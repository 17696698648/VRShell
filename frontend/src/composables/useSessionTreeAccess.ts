import type {SessionGroup} from '../components/SessionTreeGroup.vue'
import {
  countGroups as countSessionGroups,
  countHosts as countSessionHosts,
  createGroupId as createSessionGroupId,
  createUniqueGroupName as createUniqueSessionGroupName,
  createUniqueHostName as createUniqueSessionHostName,
  findActiveHost as findActiveSessionHost,
  findFirstHost as findFirstSessionHost,
  findGroup as findSessionGroup,
  findGroupInList as findSessionGroupInList,
  findGroupListLocation as findSessionGroupListLocation,
  findGroupPath as findSessionGroupPath,
  findHost as findSessionHost,
  findHostListLocation as findSessionHostListLocation,
  findHostLocation as findSessionHostLocation,
  flattenHosts as flattenSessionHosts,
  hasActiveHost as hasActiveSessionHost,
  removeGroupFromList as removeSessionGroupFromList,
  walkGroups as walkSessionGroups,
} from '../utils/sessionTree'

export function useSessionTreeAccess(sessionGroups: SessionGroup[]) {
  function findGroupListLocation(groupId: string, groups: SessionGroup[] = sessionGroups) {
    return findSessionGroupListLocation(groupId, groups)
  }

  function findHostListLocation(hostName: string, groups: SessionGroup[] = sessionGroups) {
    return findSessionHostListLocation(hostName, groups)
  }

  function findGroupInList(groupId: string, groups: SessionGroup[]) {
    return findSessionGroupInList(groupId, groups)
  }

  function createUniqueGroupName(siblingGroups: SessionGroup[], baseName: string) {
    return createUniqueSessionGroupName(siblingGroups, baseName)
  }

  function createUniqueHostName(baseName: string, ignoredName = '') {
    return createUniqueSessionHostName(sessionGroups, baseName, ignoredName)
  }

  function createGroupId(name: string) {
    return createSessionGroupId(sessionGroups, name)
  }

  function findGroup(groupId: string) {
    return findSessionGroup(groupId, sessionGroups)
  }

  function findGroupPath(groupId: string, groups: SessionGroup[] = sessionGroups, path: string[] = []) {
    return findSessionGroupPath(groupId, groups, path)
  }

  function findHost(hostName: string) {
    return findSessionHost(hostName, sessionGroups)
  }

  function findHostLocation(hostName: string) {
    return findSessionHostLocation(hostName, sessionGroups)
  }

  function findFirstHost() {
    return findFirstSessionHost(sessionGroups)
  }

  function findActiveHost() {
    return findActiveSessionHost(sessionGroups)
  }

  function hasActiveHost(group: SessionGroup) {
    return hasActiveSessionHost(group)
  }

  function removeGroupFromList(groups: SessionGroup[], groupId: string) {
    return removeSessionGroupFromList(groups, groupId)
  }

  function walkGroups(visitor: (group: SessionGroup) => void, groups: SessionGroup[] = sessionGroups) {
    walkSessionGroups(groups, visitor)
  }

  function countHosts(group: SessionGroup) {
    return countSessionHosts(group)
  }

  function countGroups(groups: SessionGroup[]) {
    return countSessionGroups(groups)
  }

  function flattenHosts(groups: SessionGroup[]) {
    return flattenSessionHosts(groups)
  }

  return {
    countGroups,
    countHosts,
    createGroupId,
    createUniqueGroupName,
    createUniqueHostName,
    findActiveHost,
    findFirstHost,
    findGroup,
    findGroupInList,
    findGroupListLocation,
    findGroupPath,
    findHost,
    findHostListLocation,
    findHostLocation,
    flattenHosts,
    hasActiveHost,
    removeGroupFromList,
    walkGroups,
  }
}
