import {describe, expect, it} from 'vitest'
import source from '../HostKeyDialogHost.vue?raw'

describe('HostKeyDialogHost safety copy', () => {
  it('explains unknown and changed host-key decisions', () => {
    expect(source).toContain('Compare this fingerprint with a trusted source before accepting')
    expect(source).toContain('Stop unless an administrator confirms the server was re-keyed')
    expect(source).toContain('Reject if you are unsure')
  })

  it('keeps changed keys blocked and exposes known_hosts guidance', () => {
    expect(source).toContain("hostKeyState.pendingRequest.reason === 'changed'")
    expect(source).toContain('Disabled for changed keys')
    expect(source).toContain('Open known_hosts')
    expect(source).toContain('docs/user-workflows.md#verify-host-keys')
  })
})
