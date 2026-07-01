import {describe, expect, it} from 'vitest'
import type {AppError} from '../../lib/appError'
import {getErrorDisplayPolicy} from '../errorDisplayPolicy'

const baseError: AppError = {
  code: 'unknown.error',
  message: 'failed',
  recoverable: true,
  severity: 'error',
  source: 'ssh',
}

describe('errorDisplayPolicy', () => {
  it('maps stable backend codes to connection actions', () => {
    expect(getErrorDisplayPolicy({...baseError, code: 'validationError'})).toMatchObject({kind: 'invalid-input', severity: 'warning'})
    expect(getErrorDisplayPolicy({...baseError, code: 'authenticationError'})).toMatchObject({kind: 'authentication', severity: 'warning'})
    expect(getErrorDisplayPolicy({...baseError, code: 'hostKeyUnknown'})).toMatchObject({kind: 'unknown-host-key', severity: 'warning'})
    expect(getErrorDisplayPolicy({...baseError, code: 'networkError'})).toMatchObject({kind: 'network', severity: 'error'})
  })

  it('keeps changed host keys non-recoverable', () => {
    expect(getErrorDisplayPolicy({...baseError, code: 'hostKeyChanged', recoverable: false, severity: 'fatal'})).toMatchObject({
      kind: 'host-key-changed',
      recoverable: false,
      severity: 'fatal',
    })
  })

  it('falls back based on recoverability without parsing messages', () => {
    expect(getErrorDisplayPolicy({...baseError, code: 'backendBusy'})).toMatchObject({kind: 'retryable-backend', recoverable: true})
    expect(getErrorDisplayPolicy({...baseError, code: 'fatalBackend', recoverable: false, severity: 'fatal'})).toMatchObject({kind: 'backend', recoverable: false})
  })
})
