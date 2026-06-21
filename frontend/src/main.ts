import {createApp} from 'vue'
import App from './app/App.vue'
import './shared/styles/base.css'
import './shared/styles/theme.css'
import './shared/styles/workbench.css'
import './shared/ui/ui.css'
import './shell/styles/shell.css'
import './shell/styles/overlays.css'
import './shell/dock/dock.css'
import './widgets/styles/widgets.css'
import './widgets/workbench-layout/ui/workbench-layout.css'
import './widgets/logs-panel/ui/logs-panel.css'
import './widgets/problems-panel/ui/problems-panel.css'
import './widgets/output-panel/ui/output-panel.css'
import {bootstrapApp} from './app/lifecycle/bootstrapApp'

bootstrapApp()

createApp(App).mount('#app')
