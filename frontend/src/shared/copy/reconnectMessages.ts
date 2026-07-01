export const reconnectMessages = {
  action: 'Reconnect',
  terminalReconnectTitle: 'Reconnect required',
  terminalFailed: (title: string) => `${title} failed. Reconnect or inspect logs.`,
  terminalDisconnected: (title: string) => `${title} is disconnected. Reconnect to continue terminal and SFTP workflows.`,
  sftpDisconnected: 'Session is disconnected. Reconnect the terminal before using SFTP.',
  sftpReconnectTitle: 'Reconnect required',
}
