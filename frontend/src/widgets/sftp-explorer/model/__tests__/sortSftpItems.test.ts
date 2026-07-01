import {describe, expect, it} from 'vitest'
import {sortSftpItems} from '../sortSftpItems'

const items = [
  {id: 'dir-beta', name: 'beta', path: '/srv/beta', type: 'directory', size: '-', modifiedAt: '2026-07-01'},
  {id: 'dir-alpha', name: 'alpha', path: '/srv/alpha', type: 'directory', size: '-', modifiedAt: '2026-07-01'},
  {id: 'file-gamma', name: 'gamma.log', path: '/srv/gamma.log', type: 'file', size: '10 KB', modifiedAt: '2026-07-03'},
  {id: 'file-beta', name: 'beta.log', path: '/srv/beta.log', type: 'file', size: '2 KB', modifiedAt: '2026-07-02'},
] as const

describe('sortSftpItems', () => {
  it('reuses backend order for the default name ascending view', () => {
    const sorted = sortSftpItems(items as never, 'name', 'asc')

    expect(sorted).toBe(items)
  })

  it('sorts files by size while keeping directories first', () => {
    const sorted = sortSftpItems(items as never, 'size', 'desc')

    expect(sorted.map((item) => item.id)).toEqual(['dir-beta', 'dir-alpha', 'file-gamma', 'file-beta'])
  })

  it('sorts names descending when requested', () => {
    const sorted = sortSftpItems(items as never, 'name', 'desc')

    expect(sorted.map((item) => item.id)).toEqual(['dir-beta', 'dir-alpha', 'file-gamma', 'file-beta'])
  })
})

