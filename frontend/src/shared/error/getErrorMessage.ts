import {getIpcErrorDisplayMessage} from '../ipc/ipcErrors'

export function getErrorMessage(error: unknown) {
  return getIpcErrorDisplayMessage(error)
}
