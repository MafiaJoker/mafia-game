import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { createI18n } from 'vue-i18n'

// Глобальные стили
import './assets/global.css'

import App from './App.vue'
import router from './router'
import { messages } from './locales'
import { useAuthStore } from './stores/auth'

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

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.use(i18n)

// Инициализация загрузки текущего пользователя
const authStore = useAuthStore()
authStore.loadCurrentUser().catch((error) => {
    console.log('No user session found on startup:', error)
})

app.mount('#app')
