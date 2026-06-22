import {describe, expect, it} from 'vitest'
import source from '../SessionForm.vue?raw'

describe('SessionForm contract', () => {
  it('exposes password authentication fields', () => {
    expect(source).toContain('<option value="password">Password</option>')
    expect(source).toContain('form.auth.type === \'password\'')
    expect(source).toContain('type="password"')
    expect(source).toContain('placeholder="Password"')
  })

  it('keeps private key fields available', () => {
    expect(source).toContain('<option value="key">Private key</option>')
    expect(source).toContain('placeholder="Private key path"')
    expect(source).toContain('placeholder="Key passphrase (optional)"')
  })
})
