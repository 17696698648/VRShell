import {describe, expect, it} from 'vitest'
import {IpcError} from '../../../../shared/ipc/ipcErrors'
import {connectionFailureSummary, normalizeConnectionFailure} from '../connectionFailure'

describe('connectionFailure', () => {
  it('makes validation failures actionable', () => {
    const failure = normalizeConnectionFailure(
      new IpcError('connect_ssh', {code: 'validationError', kind: 'validation', message: 'host is required', recoverable: true}),
    )

    expect(failure).toMatchObject({
      kind: 'invalid-input',
      message: 'Connection details are incomplete or invalid.',
      severity: 'warning',
      recoverable: true,
      source: 'ssh',
    })
    expect(failure.detail).toContain('Check the host, port, username')
  })

  it('distinguishes authentication failures', () => {
    const failure = normalizeConnectionFailure(
      new IpcError('connect_ssh', {code: 'credentialError', kind: 'credential', message: 'ssh password authentication failed', recoverable: true}),
    )

    expect(failure).toMatchObject({
      kind: 'authentication',
      message: 'SSH authentication failed.',
      severity: 'warning',
      recoverable: true,
    })
    expect(failure.detail).toContain('private key')
  })

  it('treats changed host keys as non-recoverable', () => {
    const failure = normalizeConnectionFailure(
      new IpcError('connect_ssh', {code: 'hostKeyChanged', kind: 'security', message: 'host key changed', recoverable: false}),
    )

    expect(failure).toMatchObject({
      kind: 'host-key-changed',
      message: 'SSH host key changed.',
      severity: 'fatal',
      recoverable: false,
    })
    expect(failure.detail).toContain('Do not connect')
  })

  it('keeps unknown host keys recoverable with verification guidance', () => {
    const failure = normalizeConnectionFailure(
      new IpcError('connect_ssh', {code: 'hostKeyUnknown', kind: 'security', message: 'unknown host key', recoverable: true}),
    )

    expect(failure).toMatchObject({
      kind: 'unknown-host-key',
      message: 'Unknown SSH host key.',
      severity: 'warning',
      recoverable: true,
    })
    expect(failure.detail).toContain('Verify the fingerprint')
  })

  it('redacts secrets from details and summaries', () => {
    const summary = connectionFailureSummary(
      new IpcError('connect_ssh', {code: 'networkError', kind: 'network', message: 'failed password=secret token=abc', recoverable: true}),
    )
    const failure = normalizeConnectionFailure(
      new IpcError('connect_ssh', {code: 'networkError', kind: 'network', message: 'failed password=secret token=abc', recoverable: true}),
    )

    expect(summary).toContain('Network connection failed.')
    expect(failure.detail).toContain('password=[redacted] token=[redacted]')
    expect(failure.detail).not.toContain('secret')
    expect(failure.detail).not.toContain('abc')
  })
})
