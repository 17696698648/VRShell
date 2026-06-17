import {computed} from 'vue'
import type {SessionGroup} from '../components/SessionTreeGroup.vue'

export function useHomeDashboardState(options: {
  sessionGroups: SessionGroup[]
  countGroups: (groups: SessionGroup[]) => number
  countHosts: (group: SessionGroup) => number
  flattenHosts: (groups: SessionGroup[]) => Array<{
    name: string
    user: string
    address: string
    port: number
  }>
}) {
  const recentConnections = computed(() => options.flattenHosts(options.sessionGroups).slice(0, 5).map((host) => ({
    name: host.name,
    meta: `${host.user || 'user'}@${host.address}:${host.port}`,
  })))

  const homeStats = computed(() => ({
    hosts: options.sessionGroups.reduce((total, group) => total + options.countHosts(group), 0),
    groups: options.countGroups(options.sessionGroups),
  }))

  const homeTitle = computed(() => (
    homeStats.value.hosts > 0 ? 'Select a session to start' : 'Create your first SSH session'
  ))

  const homeDescription = computed(() => (
    homeStats.value.hosts > 0
      ? 'Open a recent connection or pick one from the session tree.'
      : 'Create a connection to use terminal, SFTP, and editor in one window.'
  ))

  return {
    homeDescription,
    homeStats,
    homeTitle,
    recentConnections,
  }
}
