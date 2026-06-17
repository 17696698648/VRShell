export async function applySessionTabAction(options: {
  hostName: string
  action: string
  openedSessionNames: string[]
  closeSessionTabs: (hostNames: string[]) => Promise<void>
  closeSessionTab: (hostName: string) => Promise<void>
  selectSessionTab: (hostName: string) => void
}) {
  if (options.action === 'close_current_session') {
    await options.closeSessionTab(options.hostName)
    return
  }

  if (options.action === 'close_other_sessions') {
    await options.closeSessionTabs(options.openedSessionNames.filter((name) => name !== options.hostName))
    options.selectSessionTab(options.hostName)
    return
  }

  if (options.action === 'close_right_sessions') {
    const hostIndex = options.openedSessionNames.indexOf(options.hostName)
    if (hostIndex >= 0) {
      await options.closeSessionTabs(options.openedSessionNames.slice(hostIndex + 1))
    }
    options.selectSessionTab(options.hostName)
    return
  }

  if (options.action === 'close_all_sessions') {
    await options.closeSessionTabs([...options.openedSessionNames])
  }
}
