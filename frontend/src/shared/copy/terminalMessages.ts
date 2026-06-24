export const terminalMessages = {
  failures: {
    outputStopped: (title: string) => `Terminal output stopped for ${title}`,
    sendInput: (title: string) => `Failed to send input to ${title}`,
    resize: (title: string) => `Failed to resize ${title}`,
    disconnect: (title: string) => `Failed to disconnect ${title}`,
    open: 'Failed to open terminal',
  },
}
