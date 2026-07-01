import {describe, expect, it} from 'vitest'
import source from '../WelcomePage.vue?raw'

describe('WelcomePage onboarding contract', () => {
  it('shows dismissible first-run guidance for connection setup', () => {
    expect(source).toContain('Connect safely in four steps')
    expect(source).toContain('Create a session')
    expect(source).toContain('Choose authentication')
    expect(source).toContain('Verify host keys')
    expect(source).toContain('Open SFTP')
    expect(source).toContain('dismissOnboarding')
  })

  it('links to user workflow docs and persists dismissal locally', () => {
    expect(source).toContain('docs/user-workflows.md')
    expect(source).toContain("localStorage.setItem(onboardingStorageKey, 'true')")
    expect(source).toContain("localStorage.getItem(onboardingStorageKey) === 'true'")
  })
})
