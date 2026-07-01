import type {SftpItem} from '../../../entities/sftp'

export type SftpSortKey = 'type' | 'name' | 'size' | 'modifiedAt'
export type SftpSortDirection = 'asc' | 'desc'
const naturalCollator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})

export function sortSftpItems(items: SftpItem[], key: SftpSortKey, direction: SftpSortDirection) {
  if (items.length <= 1) return items
  if (key === 'name' && direction === 'asc') return items

  const directionFactor = direction === 'asc' ? 1 : -1
  return [...items].sort((left, right) => {
    if (left.type !== right.type) return left.type === 'directory' ? -1 : 1
    return compareByKey(left, right, key) * directionFactor
  })
}

function compareByKey(left: SftpItem, right: SftpItem, key: SftpSortKey) {
  if (key === 'size') return parseSize(left.size) - parseSize(right.size)
  return naturalCollator.compare(String(left[key]), String(right[key]))
}

function parseSize(size: string) {
  const normalized = size.trim().toLowerCase()
  const value = Number.parseFloat(normalized)
  if (Number.isNaN(value)) return 0
  if (normalized.includes('gb')) return value * 1024 * 1024 * 1024
  if (normalized.includes('mb')) return value * 1024 * 1024
  if (normalized.includes('kb')) return value * 1024
  return value
}
