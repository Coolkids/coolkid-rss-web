import { createApp } from 'vue'
import { Quasar } from 'quasar'
import App from './App.vue'
import router from './router'
import quasarUserOptions from './quasar-user-options'

import 'quasar/src/css/index.sass'

createApp(App)
  .use(Quasar, quasarUserOptions)
  .use(router)
  .mount('#app')
