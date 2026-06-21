export interface SftpItem {
  id: string
  name: string
  path: string
  type: 'file' | 'directory'
  size: string
  modifiedAt: string
}
