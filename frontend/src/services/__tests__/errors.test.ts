import {describe, expect, it} from 'vitest'
import {formatAppError, redactSensitiveText, summarizeAppError, toAppError} from '../errors'

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

  it('classifies retryable network errors', () => {
    const error = toAppError({code: 'connection', message: 'session closed', recoverable: true})
    expect(error.category).toBe('network')
    expect(error.retryable).toBe(true)
    expect(error.severity).toBe('error')
  })

  it('marks permission errors as warnings without retry', () => {
    const error = toAppError({code: 'permission_denied', message: 'denied', recoverable: false})
    expect(error.category).toBe('permission')
    expect(error.retryable).toBe(false)
    expect(error.severity).toBe('warning')
  })

  it('summarizes retryable errors with a retry hint', () => {
    const summary = summarizeAppError({code: 'size_mismatch', message: 'bad size', recoverable: true})
    expect(summary).toContain('transfer')
    expect(summary).toContain('Retry is available')
  })

  it('classifies invalid path errors as filesystem issues', () => {
    const error = toAppError({code: 'invalid_path', message: 'unsafe path', recoverable: false})
    expect(error.category).toBe('filesystem')
    expect(error.retryable).toBe(false)
    expect(error.suggestion).toContain('unsafe traversal')
  })
})
