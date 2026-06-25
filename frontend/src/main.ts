import {createApp} from 'vue'
import App from './app/App.vue'
import {pinia} from './shared/stores'
import './styles.css'
import {bootstrapApp} from './app/lifecycle/bootstrapApp'

bootstrapApp()

createApp(App).use(pinia).mount('#app')
