import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { createI18n } from 'vue-i18n'

// MD Editor V3 для Markdown
import { MdEditor, MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

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

// Регистрируем MD Editor V3 компоненты
app.component('MdEditor', MdEditor)
app.component('MdPreview', MdPreview)

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.use(i18n)

// Инициализация загрузки текущего пользователя при старте приложения
const authStore = useAuthStore()

// Создаем Promise для ожидания инициализации авторизации
const authInitPromise = authStore.loadCurrentUser().catch((error) => {
    console.log('No user session found on startup:', error)
}).finally(() => {
    console.log('Initial auth check completed')
})

// Сохраняем Promise для использования в router guard
window.__authInitPromise = authInitPromise

// Инициализация Electron менеджера
const electronManager = new ElectronManager()
electronManager.init().then(() => {
    if (electronManager.isElectron) {
        console.log('Running in Electron environment')
        electronManager.setupMenuHandlers(router)
    }
})

app.mount('#app')
