import {afterEach, describe, expect, it} from 'vitest'
import {clearSecurityDialogs, requestHostKeyDecision, resolveHostKeyDecision, securityState} from '../security.store'

describe('security store', () => {
  afterEach(() => clearSecurityDialogs())

  it('tracks host key dialog requests and resolves decisions', async () => {
    const decision = requestHostKeyDecision({
      host: 'example.com',
      port: 22,
      reason: 'unknown',
      fingerprint: {algorithm: 'SHA256', value: 'abc'},
    })

    expect(securityState.hostKeyDialog).toMatchObject({host: 'example.com', reason: 'unknown'})
    resolveHostKeyDecision('trust-and-save')
    await expect(decision).resolves.toBe('trust-and-save')
    expect(securityState.hostKeyDialog).toBeNull()
  })
})
