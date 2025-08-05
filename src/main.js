import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { createI18n } from 'vue-i18n'

// ByteMD для Markdown
import { Editor, Viewer } from '@bytemd/vue-next'
import gfm from '@bytemd/plugin-gfm'
import 'bytemd/dist/index.css'

// Глобальные стили
import './assets/global.css'

import App from './App.vue'
import router from './router'
import { messages } from './locales'
import { useAuthStore } from './stores/auth'
import { ElectronManager } from './utils/electron'

const i18n = createI18n({
  locale: 'ru',
  fallbackLocale: 'en',
  messages
})

const app = createApp(App)
const pinia = createPinia()

// Регистрируем иконки Element Plus
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// Регистрируем ByteMD компоненты
app.component('BytemdEditor', Editor)
app.component('BytemdViewer', Viewer)

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.use(i18n)

// Инициализация загрузки текущего пользователя при старте приложения
const authStore = useAuthStore()
// Запускаем проверку пользователя, но не блокируем запуск приложения
authStore.loadCurrentUser().catch((error) => {
    console.log('No user session found on startup:', error)
}).finally(() => {
    console.log('Initial auth check completed')
})

// Инициализация Electron менеджера
const electronManager = new ElectronManager()
electronManager.init().then(() => {
    if (electronManager.isElectron) {
        console.log('Running in Electron environment')
        electronManager.setupMenuHandlers(router)
    }
})

app.mount('#app')
