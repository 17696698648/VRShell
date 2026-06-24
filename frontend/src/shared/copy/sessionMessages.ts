export const sessionMessages = {
  failures: {
    connect: (name: string) => `Failed to connect ${name}`,
    importSshConfig: 'Failed to import SSH config',
    rename: (name: string) => `Failed to rename ${name}`,
  },
}
