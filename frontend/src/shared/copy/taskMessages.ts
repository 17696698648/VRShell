export const taskMessages = {
  actions: {
    cancel: 'Cancel',
    retry: 'Retry',
    retryUnavailable: 'Retry unavailable',
    showError: 'Show error',
    hideError: 'Hide error',
    copyError: 'Copy error',
    openLogs: 'Open logs',
  },
  failures: {
    cancel: (title: string) => `Failed to cancel ${title}`,
  },
  progressLabel: (title: string) => `${title} progress`,
}
