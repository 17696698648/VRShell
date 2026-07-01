import {describe, expect, it} from 'vitest'
import source from '../SftpFileList.vue?raw'

describe('SftpFileList contracts', () => {
  it('keeps SFTP directory rendering virtualized via UiDataGrid', () => {
    expect(source).toContain('<UiDataGrid')
    expect(source).toContain(':items="sortedItems"')
    expect(source).toContain(':item-height="26"')
    expect(source).toContain(':get-key="(item) => item.id"')
  })

  it('exposes meaningful row labels for assistive technology', () => {
    expect(source).toContain(':aria-label="`${item.name}, ${item.type}, ${item.size}, modified ${item.modifiedAt}`"')
  })
})
