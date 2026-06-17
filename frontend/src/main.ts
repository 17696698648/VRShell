import {createApp} from 'vue'
import App from './App.vue'
import './styles/ide-vars.css'
import './styles/base.css'
import './styles/element-plus'
import {tooltipDirective} from './directives/tooltip'
import {applyInitialThemeToDocument} from './composables/useThemeState'

applyInitialThemeToDocument()

const app = createApp(App)
app.directive('tooltip', tooltipDirective)
app.mount('#app')
