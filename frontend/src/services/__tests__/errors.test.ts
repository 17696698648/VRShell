import {describe, expect, it} from 'vitest'
import {formatAppError, redactSensitiveText, toAppError} from '../errors'

describe('errors service', () => {
  it('redacts password-like values and home paths', () => {
    const message = redactSensitiveText('password=secret passphrase:abc /Users/alice/.ssh/id_ed25519')
    expect(message).toContain('password=<redacted>')
    expect(message).toContain('passphrase=<redacted>')
    expect(message).toContain('<user-path>')
  })

  it('formats structured errors with suggestions', () => {
    const message = formatAppError({code: 'auth_failed', message: 'auth failed', recoverable: true})
    expect(message).toContain('auth failed')
    expect(message).toContain('Check the username')
  })

  it('normalizes unknown errors', () => {
    const error = toAppError(new Error('boom'))
    expect(error.code).toBe('unknown')
    expect(error.message).toBe('boom')
  })
})
