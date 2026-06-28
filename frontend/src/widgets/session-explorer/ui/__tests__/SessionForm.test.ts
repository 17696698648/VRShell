import {describe, expect, it} from 'vitest'
import source from '../SessionForm.vue?raw'

describe('SessionForm contract', () => {
  it('exposes password authentication fields', () => {
    expect(source).toContain("{label: 'Password', value: 'password'}")
    expect(source).toContain('<UiSelect')
    expect(source).toContain('form.auth.type === \'password\'')
    expect(source).toContain('type="password"')
    expect(source).toContain('placeholder="Password"')
  })

  it('keeps private key fields available', () => {
    expect(source).toContain("{label: 'Private key', value: 'key'}")
    expect(source).toContain('placeholder="~/.ssh/id_ed25519"')
    expect(source).toContain('placeholder="Optional"')
  })
})
