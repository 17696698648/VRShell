import {describe, expect, it} from 'vitest'
import {getSftpBodyState, type SftpBodyStateCopy} from '../sftpBodyState'

const copy: SftpBodyStateCopy = {
  emptyTitle: 'No remote files',
  emptyWithSession: 'This directory is empty.',
  emptyWithoutSessionTitle: 'Connect a session first',
  emptyWithoutSession: 'Connect a session to browse files.',
  loadingDirectory: 'Loading directory',
  unableToLoadDirectory: 'Unable to load directory',
}

describe('getSftpBodyState', () => {
  it('prioritizes errors over loading and content state', () => {
    expect(getSftpBodyState({activeSession: true, copy, error: 'permission denied', itemCount: 4, loading: true})).toMatchObject({
      description: 'permission denied',
      kind: 'error',
      title: 'Unable to load directory',
    })
  })

  it('returns loading before empty or disconnected states', () => {
    expect(getSftpBodyState({activeSession: false, copy, error: '', itemCount: 0, loading: true}).kind).toBe('loading')
  })

  it('distinguishes disconnected and empty directory states', () => {
    expect(getSftpBodyState({activeSession: false, copy, error: '', itemCount: 0, loading: false})).toMatchObject({kind: 'disconnected', title: copy.emptyWithoutSessionTitle, description: copy.emptyWithoutSession})
    expect(getSftpBodyState({activeSession: true, copy, error: '', itemCount: 0, loading: false})).toMatchObject({kind: 'empty', description: copy.emptyWithSession})
  })

  it('returns ready when connected content is available', () => {
    expect(getSftpBodyState({activeSession: true, copy, error: '', itemCount: 1, loading: false}).kind).toBe('ready')
  })
})
