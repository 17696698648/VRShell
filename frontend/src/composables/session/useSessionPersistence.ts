import { invoke } from '@tauri-apps/api/core'
import { reactive, ref, watch } from 'vue'
import type { SessionGroup, SessionHost } from '../../components/SessionTreeGroup.vue'

export const ALL_SESSIONS_GROUP_ID = 'all'
export const ALL_SESSIONS_GROUP_NAME = 'All'

type PersistedSessionHost = SessionHost
type PersistedSessionGroup = Omit<SessionGroup, 'hosts' | 'children'> & {
  hosts: PersistedSessionHost[]
  children: PersistedSessionGroup[]
}

export function createDefaultSessionGroups(): SessionGroup[] {
  return [
    {
      id: ALL_SESSIONS_GROUP_ID,
      name: ALL_SESSIONS_GROUP_NAME,
      icon: '*',
      hosts: [],
      children: [],
    },
  ]
}

export function createExpandedState(groups: SessionGroup[]) {
  const state: Record<string, boolean> = {}
  groups.forEach((group) => {
    state[group.id] = true
    Object.assign(state, createExpandedState(group.children))
  })
  return state
}

function fromPersistedGroup(group: PersistedSessionGroup): SessionGroup {
  return {
    id: group.id,
    name: group.name,
    icon: group.icon,
    hosts: group.hosts.map((host) => ({
      name: host.name,
      user: host.user,
      address: host.address,
      port: host.port,
      authMethod: host.authMethod,
      password: host.password,
      passwordKeyringId: host.passwordKeyringId,
      privateKeyPath: host.privateKeyPath ?? '',
      passphrase: host.passphrase ?? '',
      remark: host.remark,
      latency: '-',
      status: 'idle',
      active: false,
    })),
    children: group.children.map(fromPersistedGroup),
  }
}

function toPersistedGroup(group: SessionGroup): PersistedSessionGroup {
  return {
    id: group.id,
    name: group.name,
    icon: group.icon,
    hosts: group.hosts.map((host) => ({
      name: host.name,
      user: host.user,
      address: host.address,
      port: host.port,
      authMethod: host.authMethod,
      password: host.password,
      passwordKeyringId: host.passwordKeyringId,
      privateKeyPath: host.privateKeyPath ?? '',
      passphrase: host.passphrase ?? '',
      remark: host.remark,
      latency: '-',
      status: 'idle',
      active: false,
    })),
    children: group.children.map(toPersistedGroup),
  }
}

function normalizeTopLevelGroups(groups: SessionGroup[]): SessionGroup[] {
  const defaultRoot = createDefaultSessionGroups()[0]
  const allGroups = groups.filter((group) => group.id === ALL_SESSIONS_GROUP_ID || group.name === ALL_SESSIONS_GROUP_NAME || group.name === '鍏ㄩ儴')
  const otherGroups = groups.filter((group) => !allGroups.includes(group))
  const root = allGroups[0] ?? defaultRoot

  root.id = ALL_SESSIONS_GROUP_ID
  root.name = ALL_SESSIONS_GROUP_NAME
  root.icon = '*'

  const mergedAllGroups = allGroups.slice(1)
  root.hosts.push(...mergedAllGroups.flatMap((group) => group.hosts))
  root.children.push(...mergedAllGroups.flatMap((group) => group.children), ...otherGroups)

  return [root]
}

export function useSessionPersistence() {
  const sessionGroups = reactive<SessionGroup[]>(createDefaultSessionGroups())
  const expandedGroups = reactive<Record<string, boolean>>(createExpandedState(sessionGroups))
  const isSessionTreeLoaded = ref(false)
  const isApplyingPersistedSessionTree = ref(false)

  // O(1) lookup indexes, rebuilt on tree change
  const hostMap = reactive<Map<string, SessionHost>>(new Map())
  const groupMap = reactive<Map<string, SessionGroup>>(new Map())
  let persistTimer: number | null = null

  function rebuildIndexes(groups: SessionGroup[] = sessionGroups) {
    hostMap.clear()
    groupMap.clear()
    function walk(groupList: SessionGroup[]) {
      for (const group of groupList) {
        groupMap.set(group.id, group)
        for (const host of group.hosts) {
          hostMap.set(host.name, host)
        }
        walk(group.children)
      }
    }
    walk(groups)
  }

  async function loadPersistedSessionTree() {
    try {
      const persistedGroups = await invoke<PersistedSessionGroup[]>('load_session_tree')
      const nextGroups = persistedGroups.length > 0 ? normalizeTopLevelGroups(persistedGroups.map(fromPersistedGroup)) : createDefaultSessionGroups()
      isApplyingPersistedSessionTree.value = true
      sessionGroups.splice(0, sessionGroups.length, ...nextGroups)
      Object.keys(expandedGroups).forEach((groupId) => delete expandedGroups[groupId])
      Object.assign(expandedGroups, createExpandedState(sessionGroups))
      rebuildIndexes(sessionGroups)
    } catch (error) {
      console.error('load session tree failed:', error)
    } finally {
      isApplyingPersistedSessionTree.value = false
      isSessionTreeLoaded.value = true
    }
  }

  async function persistSessionTree() {
    if (sessionGroups.length === 0) {
      return
    }

    rebuildIndexes(sessionGroups)

    try {
      await invoke('save_session_tree', { groups: sessionGroups.map(toPersistedGroup) })
    } catch (error) {
      console.error('save session tree failed:', error)
    }
  }

  function schedulePersistSessionTree() {
    if (persistTimer !== null) {
      window.clearTimeout(persistTimer)
    }

    persistTimer = window.setTimeout(() => {
      persistTimer = null
      void persistSessionTree()
    }, 500)
  }

  watch(
    sessionGroups,
    () => {
      if (!isSessionTreeLoaded.value || isApplyingPersistedSessionTree.value) {
        return
      }

      schedulePersistSessionTree()
    },
    { deep: true },
  )

  return {
    sessionGroups,
    expandedGroups,
    isSessionTreeLoaded,
    isApplyingPersistedSessionTree,
    hostMap,
    groupMap,
    rebuildIndexes,
    loadPersistedSessionTree,
    persistSessionTree,
    schedulePersistSessionTree,
  }
}
