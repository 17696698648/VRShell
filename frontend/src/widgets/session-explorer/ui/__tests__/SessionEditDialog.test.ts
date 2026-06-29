import {describe, expect, it} from 'vitest'
import source from '../SessionEditDialog.vue?raw'

describe('SessionEditDialog contract', () => {
  it('passes tags into the form and exposes connection testing', () => {
    expect(source).toContain('tags: props.session.tags')
    expect(source).toContain('Test connection')
    expect(source).toContain('diagnosticApi.testSshConnection')
    expect(source).toContain('dialog__status')
  })
})
