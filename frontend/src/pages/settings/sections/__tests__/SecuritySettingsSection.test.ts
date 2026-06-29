import {describe, expect, it} from 'vitest'
import source from '../SecuritySettingsSection.vue?raw'

describe('SecuritySettingsSection contract', () => {
  it('exposes known_hosts and credential storage guidance', () => {
    expect(source).toContain('Known hosts')
    expect(source).toContain('securityApi.knownHostsPath')
    expect(source).toContain('securityApi.openKnownHosts')
    expect(source).toContain('Credential storage')
    expect(source).toContain('OS keyring')
  })
})
