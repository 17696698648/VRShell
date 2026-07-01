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

  it('redacts common token variants, authorization headers, and local user paths', () => {
    expect(
      sanitizeSensitiveText('Authorization: Bearer abc access_token=one refresh-token:two C:\\Users\\alice\\app.env /home/deploy/.ssh/id_rsa /Users/bob/.ssh/config'),
    ).toBe(
      'Authorization: [redacted] access_token=[redacted] refresh-token:[redacted] C:\\Users\\[redacted]\\app.env /home/[redacted]/.ssh/id_rsa /Users/[redacted]/.ssh/config',
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
