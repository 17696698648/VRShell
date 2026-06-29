import {markRaw} from 'vue'
import {registerSettingsSection} from '../../features/settings/settings-registry'
import AppearanceSettingsSection from '../../pages/settings/sections/AppearanceSettingsSection.vue'
import GeneralSettingsSection from '../../pages/settings/sections/GeneralSettingsSection.vue'
import KeybindingsSettingsSection from '../../pages/settings/sections/KeybindingsSettingsSection.vue'
import LayoutSettingsSection from '../../pages/settings/sections/LayoutSettingsSection.vue'
import PlaceholderSettingsSection from '../../pages/settings/sections/PlaceholderSettingsSection.vue'
import SecuritySettingsSection from '../../pages/settings/sections/SecuritySettingsSection.vue'
import SshSettingsSection from '../../pages/settings/sections/SshSettingsSection.vue'
import SftpSettingsSection from '../../pages/settings/sections/SftpSettingsSection.vue'
import TerminalSettingsSection from '../../pages/settings/sections/TerminalSettingsSection.vue'

export function registerDefaultSettingsSections() {
  const disposables = [
    registerSettingsSection({id: 'General', title: 'General', order: 10, keywords: ['startup', 'workspace', 'restore', 'import'], component: markRaw(GeneralSettingsSection)}),
    registerSettingsSection({id: 'Appearance', title: 'Appearance', order: 20, keywords: ['theme', 'density', 'color'], component: markRaw(AppearanceSettingsSection)}),
    registerSettingsSection({id: 'Layout', title: 'Layout', order: 25, keywords: ['preset', 'dock', 'compact', 'split'], component: markRaw(LayoutSettingsSection)}),
    registerSettingsSection({id: 'Terminal', title: 'Terminal', order: 30, component: markRaw(TerminalSettingsSection)}),
    registerSettingsSection({id: 'SSH', title: 'SSH', order: 40, keywords: ['host', 'known_hosts', 'latency', 'diagnostic', 'auth'], component: markRaw(SshSettingsSection)}),
    registerSettingsSection({id: 'SFTP', title: 'SFTP', order: 50, component: markRaw(SftpSettingsSection)}),
    registerSettingsSection({id: 'Keybindings', title: 'Keybindings', order: 60, keywords: ['shortcut', 'command', 'scope'], component: markRaw(KeybindingsSettingsSection)}),
    registerSettingsSection({id: 'Security', title: 'Security', order: 70, component: markRaw(SecuritySettingsSection)}),
  ]
  return () => disposables.forEach((dispose) => dispose())
}
