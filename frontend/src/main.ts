import {createApp} from 'vue'
import App from './App.vue'
import './styles/ide-vars.css'
import './styles/base.css'
import './styles/element-plus'
import './styles/workspace-tabs.css'
import {tooltipDirective} from './directives/tooltip'
import {applyInitialThemeToDocument} from './composables/ui/useThemeState'

applyInitialThemeToDocument()

const app = createApp(App)
app.directive('tooltip', tooltipDirective)
app.mount('#app')
