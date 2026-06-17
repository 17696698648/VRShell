import type {WritableComputedRef} from 'vue'
import type {SftpFileItem} from '../types'

export function useSftpClipboardActions(options: {
  sftpStatus: WritableComputedRef<string>
  copyText: (value: string) => Promise<void>
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void
}) {
  async function copySftpPath(targetPath: string) {
    await options.copyText(targetPath)
    options.sftpStatus.value = 'Copied path'
    options.showToast('Copied path', 'success')
  }

  async function copySftpName(targetPath: string, targetFile?: SftpFileItem | null) {
    await options.copyText(targetFile?.name ?? targetPath.split('/').filter(Boolean).at(-1) ?? targetPath)
    options.sftpStatus.value = 'Copied name'
    options.showToast('Copied name', 'success')
  }

  async function copySftpCdCommand(targetPath: string) {
    await options.copyText(`cd ${quoteShellPath(targetPath)}`)
    options.sftpStatus.value = 'Copied cd command'
    options.showToast('Copied cd command', 'success')
  }

  return {
    copySftpCdCommand,
    copySftpName,
    copySftpPath,
  }
}

function quoteShellPath(path: string) {
  return `'${path.replace(/'/g, `'\\''`)}'`
}
