import {afterEach, describe, expect, it} from 'vitest'
import {clearLogs, logMessage, logState} from '../logger'
import {clearOutput, outputState, writeOutput} from '../outputChannels'
import {sanitizeSensitiveText} from '../sanitizeSensitiveText'

describe('sanitizeSensitiveText', () => {
  afterEach(() => {
    clearLogs()
    clearOutput()
  })

  it('redacts spaced, json, and PEM secret patterns', () => {
    expect(
      sanitizeSensitiveText('password = secret token:abc {"privateKeyPath":"C:/secret.pem"} -----BEGIN OPENSSH PRIVATE KEY-----\nsecret\n-----END OPENSSH PRIVATE KEY-----'),
    ).toBe(
      'password = [redacted] token:[redacted] {"privateKeyPath":"[redacted]"} -----BEGIN OPENSSH PRIVATE KEY-----[redacted]-----END OPENSSH PRIVATE KEY-----',
    )
  })

  it('scrubs log entries before they reach the logs panel state', () => {
    logMessage({
      detail: 'privateKey=secret-value',
      level: 'error',
      message: 'token=abc123',
      source: 'ipc',
    })

    expect(logState.entries[0]).toMatchObject({
      detail: 'privateKey=[redacted]',
      message: 'token=[redacted]',
    })
  })

  it('scrubs output channel entries before they are rendered', () => {
    writeOutput('Task', 'password=super-secret')

    expect(outputState.entries[0]?.message).toBe('password=[redacted]')
  })
})

