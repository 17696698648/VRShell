import {appMessages} from './appMessages'
import {reconnectMessages} from './reconnectMessages'
import {sessionMessages} from './sessionMessages'
import {sftpMessages} from './sftpMessages'
import {taskMessages} from './taskMessages'
import {terminalMessages} from './terminalMessages'

export const messages = {
  app: appMessages,
  session: sessionMessages,
  reconnect: reconnectMessages,
  sftp: sftpMessages,
  task: taskMessages,
  terminal: terminalMessages,
}
