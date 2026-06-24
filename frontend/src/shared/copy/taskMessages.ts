export const taskMessages = {
  actions: {
    cancel: 'Cancel',
    retry: 'Retry',
    showError: 'Show error',
    hideError: 'Hide error',
    copyError: 'Copy error',
  },
  failures: {
    cancel: (title: string) => `Failed to cancel ${title}`,
  },
  progressLabel: (title: string) => `${title} progress`,
}
