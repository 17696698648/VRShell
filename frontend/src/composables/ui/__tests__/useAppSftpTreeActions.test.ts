import { computed, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { SessionHost } from '../../../components/SessionTreeGroup.vue'
import type { SftpFileItem, SftpTreeNode } from '../../../types'
import { useAppSftpTreeActions } from '../useAppSftpTreeActions'

function host(): SessionHost {
  return {
    name: 'prod',
    user: 'root',
    address: 'example.com',
    port: 22,
    authMethod: 'password',
    password: '',
    privateKeyPath: '',
    passphrase: '',
    remark: '',
    latency: '-',
    status: 'idle',
    active: true,
  }
}

function file(path: string, name = path.split('/').pop() || '/'): SftpFileItem {
  return {
    name,
    path,
    icon: { type: 'file', color: '#fff' },
    meta: 'file',
    size: '0 B',
    sizeBytes: 0,
    modified: 0,
    modifiedText: '-',
    isDirectory: false,
  }
}

function node(path: string, name = path.split('/').pop() || '/'): SftpTreeNode {
  return {
    ...file(path, name),
    isDirectory: true,
    children: [],
    depth: 0,
    expanded: false,
    loading: false,
    loaded: false,
  }
}

function writable<T>(initial: T) {
  const value = ref(initial)
  return computed({
    get: () => value.value,
    set: (next) => (value.value = next),
  })
}

function createActions(options: {
  active?: boolean
  files?: SftpFileItem[]
  tree?: SftpTreeNode[]
  loading?: boolean
} = {}) {
  const sftpFiles = writable<SftpFileItem[]>(options.files ?? [])
  const sftpPath = writable('/')
  const sftpStatus = writable('')
  const sftpTree = writable<SftpTreeNode[]>(options.tree ?? [])
  const sftpTreeLoading = ref(options.loading ?? false)
  const calls = {
    findSftpTreeNodeState: vi.fn((path: string, nodes?: SftpTreeNode[]) => (nodes ?? sftpTree.value).find((item: SftpTreeNode) => item.path === path) ?? null),
    loadSftpTreeRoot: vi.fn().mockResolvedValue(undefined),
    openSftpPathState: vi.fn().mockResolvedValue(undefined),
    refreshSftpTreePathState: vi.fn().mockResolvedValue(undefined),
  }
  const actions = useAppSftpTreeActions({
    activeSession: computed(() => (options.active === false ? undefined : host())),
    findSftpTreeNodeState: calls.findSftpTreeNodeState,
    loadSftpTreeRoot: calls.loadSftpTreeRoot,
    openSftpPathState: calls.openSftpPathState,
    refreshSftpTreePathState: calls.refreshSftpTreePathState,
    sftpFiles,
    sftpPath,
    sftpStatus,
    sftpTree,
    sftpTreeLoading,
  })

  return {
    actions,
    calls,
    sftpFiles,
    sftpPath,
    sftpStatus,
    sftpTree,
  }
}

describe('useAppSftpTreeActions', () => {
  it('clears files and status when no session is active', async () => {
    const { actions, calls, sftpFiles, sftpStatus } = createActions({
      active: false,
      files: [file('/tmp/a')],
    })

    await actions.ensureActiveSftpLoaded()

    expect(sftpFiles.value).toEqual([])
    expect(sftpStatus.value).toBe('Please connect a session first')
    expect(calls.loadSftpTreeRoot).not.toHaveBeenCalled()
  })

  it('loads root tree when active tree is empty', async () => {
    const { actions, calls } = createActions({ active: true })

    await actions.ensureActiveSftpLoaded()

    expect(calls.loadSftpTreeRoot).toHaveBeenCalledTimes(1)
  })

  it('does not load root while tree is already loading', async () => {
    const { actions, calls } = createActions({ active: true, loading: true })

    await actions.ensureActiveSftpLoaded()

    expect(calls.loadSftpTreeRoot).not.toHaveBeenCalled()
  })

  it('reuses loaded root tree when file list is empty', async () => {
    const rootNode = node('/home')
    const { actions, sftpFiles, sftpPath } = createActions({
      active: true,
      tree: [rootNode],
    })

    await actions.ensureActiveSftpLoaded()

    expect(sftpPath.value).toBe('/')
    expect(sftpFiles.value).toEqual([rootNode])
  })

  it('delegates find, refresh, and open operations', async () => {
    const homeNode = node('/home')
    const { actions, calls } = createActions({ tree: [homeNode] })

    expect(actions.findSftpTreeNode('/home')).toMatchObject({ path: '/home', name: 'home' })
    await actions.refreshSftpTreePath('/home')
    await actions.openSftpPath('/home', { recordHistory: false })

    expect(calls.findSftpTreeNodeState).toHaveBeenCalledWith('/home', undefined)
    expect(calls.refreshSftpTreePathState).toHaveBeenCalledWith('/home')
    expect(calls.openSftpPathState).toHaveBeenCalledWith('/home', { recordHistory: false })
  })
})
