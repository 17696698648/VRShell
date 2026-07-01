import {nextTick, ref} from 'vue'
import {describe, expect, it} from 'vitest'
import type {SessionHost} from '../../../../entities/session'
import type {TerminalTab} from '../../../../entities/terminal'
import {highlightQuickOpenMatch, itemAddress, optionId, useQuickOpenState} from '../useQuickOpenState'

const session: SessionHost = {id: 'session-1', name: 'Prod Session', host: '10.0.0.8', port: 22, username: 'deploy', protocol: 'ssh', groupId: 'all', tags: ['favorite', 'prod'], status: 'connected'}
const firstTerminal: TerminalTab = {id: 'terminal-1', sessionId: session.id, backendSessionId: 'backend-1', title: 'First Terminal', status: 'connected', cwd: '/srv/app', lines: []}
const secondTerminal: TerminalTab = {id: 'terminal-2', sessionId: session.id, backendSessionId: 'backend-2', title: 'Second Terminal', status: 'connected', cwd: '/var/log', lines: []}

describe('useQuickOpenState', () => {
  it('sorts terminal items by recent tab order before sessions', () => {
    const state = useQuickOpenState([session], [firstTerminal, secondTerminal])

    expect(state.items.value.map((item) => item.id)).toEqual(['terminal:terminal-2', 'terminal:terminal-1', 'session:session-1'])
  })

  it('filters items and resets keyboard selection', async () => {
    const state = useQuickOpenState([session], [firstTerminal, secondTerminal])
    state.navigateDown()
    expect(state.selectedIndex.value).toBe(1)

    state.query.value = 'prod'
    await nextTick()

    expect(state.selectedIndex.value).toBe(0)
    expect(state.filteredItems.value).toHaveLength(1)
    expect(state.selectedItem.value?.id).toBe('session:session-1')

    state.query.value = '#prod'
    await nextTick()
    expect(state.filteredItems.value.map((item) => item.id)).toEqual(['session:session-1'])

    state.query.value = 'favorite'
    await nextTick()
    expect(state.filteredItems.value.map((item) => item.id)).toEqual(['session:session-1'])
  })

  it('clamps selection when filtered results shrink', async () => {
    const query = ref('terminal')
    const state = useQuickOpenState([session], [firstTerminal, secondTerminal])
    state.query.value = query.value
    await nextTick()
    state.navigateDown()
    expect(state.selectedIndex.value).toBe(1)

    state.query.value = 'first'
    await nextTick()

    expect(state.selectedIndex.value).toBe(0)
    expect(state.selectedItem.value?.id).toBe('terminal:terminal-1')
  })

  it('wraps keyboard navigation', () => {
    const state = useQuickOpenState([session], [firstTerminal])

    state.navigateUp()
    expect(state.selectedItem.value?.id).toBe('session:session-1')

    state.navigateDown()
    expect(state.selectedItem.value?.id).toBe('terminal:terminal-1')
  })

  it('formats option ids, addresses, and highlighted labels safely', () => {
    expect(optionId('terminal:one/two')).toBe('quick-open-option-terminal-one-two')
    expect(itemAddress({id: 'session:session-1', kind: 'session', label: session.name, detail: 'favorite · deploy@10.0.0.8:22 · #prod', status: session.status, session})).toBe('favorite · deploy@10.0.0.8:22 · #prod')
    expect(highlightQuickOpenMatch('<Prod>', 'prod')).toBe('&lt;<mark class="quick-open__match">Prod</mark>&gt;')
  })
})
