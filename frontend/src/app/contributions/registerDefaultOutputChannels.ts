import {registerOutputChannel} from '../../features/workspace/output-channel-registry'

export function registerDefaultOutputChannels() {
  const disposables = [
    registerOutputChannel({id: 'Terminal', title: 'Terminal', order: 10}),
    registerOutputChannel({id: 'SSH', title: 'SSH', order: 20}),
    registerOutputChannel({id: 'SFTP', title: 'SFTP', order: 30}),
    registerOutputChannel({id: 'Task', title: 'Task', order: 40}),
  ]
  return () => disposables.forEach((dispose) => dispose())
}
