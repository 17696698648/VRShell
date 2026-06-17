import type {SessionGroup} from '../components/SessionTreeGroup.vue'

export function ensureSessionOpened(openedSessionNames: string[], hostName: string) {
  if (!openedSessionNames.includes(hostName)) {
    openedSessionNames.push(hostName)
  }
}

export function getLastOpenedSession(openedSessionNames: string[]) {
  return openedSessionNames[openedSessionNames.length - 1]
}

export async function closeOpenedSessionTabs(options: {
  hostNames: string[]
  openedSessionNames: string[]
  closeSessionTab: (hostName: string) => Promise<void>
}) {
  for (const hostName of options.hostNames) {
    if (options.openedSessionNames.includes(hostName)) {
      await options.closeSessionTab(hostName)
    }
  }
}

export function activateNextSessionAfterRemoval(options: {
  shouldUpdate: boolean
  findFirstHostName: () => string | undefined
  connectSession: (hostName: string) => void
  setHasActiveSession: (value: boolean) => void
}) {
  if (!options.shouldUpdate) {
    return
  }

  const nextHostName = options.findFirstHostName()
  if (nextHostName) {
    options.connectSession(nextHostName)
    return
  }

  options.setHasActiveSession(false)
}

export function setActiveSessionHost(groups: SessionGroup[], hostName: string) {
  groups.forEach((group) => {
    group.hosts.forEach((host) => {
      if (host.name === hostName) {
        host.active = true
        if (host.status === 'idle' || host.status === 'error') {
          host.status = 'connecting'
        }
      } else {
        host.active = false
      }
    })

    setActiveSessionHost(group.children, hostName)
  })
}

export function removeSessionHost(groups: SessionGroup[], hostName: string) {
  let removedActiveSession = false

  groups.forEach((group) => {
    const sessionIndex = group.hosts.findIndex((host) => host.name === hostName)

    if (sessionIndex >= 0) {
      removedActiveSession = group.hosts[sessionIndex].active
      group.hosts.splice(sessionIndex, 1)
    }

    if (group.children.length > 0) {
      removedActiveSession = removeSessionHost(group.children, hostName) || removedActiveSession
    }
  })

  return removedActiveSession
}

export function removeOpenedSession(openedSessionNames: string[], hostName: string) {
  return openedSessionNames.filter((name) => name !== hostName)
}
