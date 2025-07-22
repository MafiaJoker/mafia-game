<template>
  <div class="telegram-login-container">
    <!-- Electron OAuth кнопка -->
    <div v-if="isElectron" class="electron-auth-section">
      <el-button
        type="primary"
        size="large"
        @click="handleElectronAuth"
        :loading="isAuthenticating"
        :disabled="isAuthenticating"
        class="telegram-oauth-button"
      >
        <el-icon class="telegram-icon"><Message /></el-icon>
        <span>Войти через Telegram</span>
      </el-button>
      <p class="auth-hint">Откроется браузер для авторизации через Telegram</p>
    </div>
    
    <!-- Web виджет для браузера -->
    <div v-else>
      <div class="telegram-widget-wrapper">
        <div 
          ref="telegramWidgetRef" 
          id="telegram-login-widget"
          class="telegram-login-widget"
        ></div>
      </div>
      
      <!-- Fallback для случаев когда виджет не загружается -->
      <div v-if="showFallback" class="telegram-fallback">
        <el-alert
          title="Не удалось загрузить виджет Telegram"
          description="Проверьте подключение к интернету и попробуйте обновить страницу"
          type="warning"
          show-icon
          :closable="false"
        />
        <el-button @click="reloadWidget" type="primary" class="mt-3">
          Попробовать снова
        </el-button>
      </div>
    </div>

    <!-- Индикатор загрузки -->
    <div v-if="isAuthenticating" class="auth-loading" v-loading="true" element-loading-text="Авторизация...">
      <div style="height: 100px;"></div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted, getCurrentInstance, computed } from 'vue'
  import { useAuthStore } from '@/stores/auth'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { Message } from '@element-plus/icons-vue'

  const props = defineProps({
    botUsername: {
      type: String,
      required: true
    },
    buttonSize: {
      type: String,
      default: 'large' // small, medium, large
    },
    cornerRadius: {
      type: Number,
      default: 20
    },
    requestAccess: {
      type: String,
      default: 'write' // read, write
    },
    userpic: {
      type: Boolean,
      default: true
    },
    authUrl: {
      type: String,
      default: window.location.origin
    }
  })

  // Проверяем, что компонент используется в правильном контексте
  const instance = getCurrentInstance()
  if (!instance) {
    throw new Error('TelegramLoginWidget must be used within a Vue component instance')
  }

  const authStore = useAuthStore()
  const router = useRouter()
  const telegramWidgetRef = ref(null)
  const showFallback = ref(false)
  const isAuthenticating = ref(false)
  const loadTimeout = ref(null)

  // Проверяем, запущено ли в Electron
  const isElectron = computed(() => {
    return typeof window !== 'undefined' && window.electronAPI !== undefined
  })

  // Обработчик авторизации в Electron
  const handleElectronAuth = async () => {
    if (!isElectron.value) {
      console.error('Electron API not available')
      ElMessage.error('Electron API недоступен')
      return
    }

    isAuthenticating.value = true

    try {
      console.log('Starting Electron Telegram OAuth')
      
      // Используем новый метод авторизации через Electron
      const result = await authStore.telegramLoginElectron(props.botUsername, props.authUrl)
      
      if (result.success) {
        ElMessage.success('Успешная авторизация через Telegram!')
        router.push('/')
      } else {
        ElMessage.error(result.error || 'Ошибка авторизации через Telegram')
      }
    } catch (error) {
      console.error('Electron Telegram auth error:', error)
      ElMessage.error('Ошибка авторизации. Попробуйте еще раз.')
    } finally {
      isAuthenticating.value = false
    }
  }

  // Глобальная функция для callback от Telegram
  const setupTelegramCallback = () => {
    window.onTelegramAuth = async (user) => {
      console.log('Telegram auth data received:', user)
      isAuthenticating.value = true
      
      try {
        // Передаем данные в формате, ожидаемом API
        const telegramData = {
          telegram_id: user.id,
          first_name: user.first_name || null,
          last_name: user.last_name || null,
          nickname: user.username || null,  // API ожидает nickname вместо username
          photo_url: user.photo_url || null,
          auth_date: user.auth_date || null,
          hash: user.hash
        }
        
        // Убираем undefined значения
        Object.keys(telegramData).forEach(key => {
          if (telegramData[key] === undefined) {
            telegramData[key] = null
          }
        })
        
        console.log('Sending to API:', telegramData)

        // Отправляем данные на авторизацию
        await authStore.telegramLogin(telegramData)
        
        ElMessage.success('Успешная авторизация через Telegram!')
        
        // Перенаправляем на главную страницу
        router.push('/')
        
      } catch (error) {
        console.error('Ошибка авторизации через Telegram:', error)
        ElMessage.error('Ошибка авторизации. Попробуйте еще раз.')
      } finally {
        isAuthenticating.value = false
      }
    }
  }

  const loadTelegramWidget = () => {
    console.log('Loading Telegram widget...')
    console.log('Bot username:', props.botUsername)
    console.log('Auth URL:', props.authUrl)
    console.log('Widget ref:', telegramWidgetRef.value)
    
    if (!telegramWidgetRef.value) {
      console.error('Telegram widget ref not found')
      showFallback.value = true
      return
    }

    // Очищаем предыдущий виджет
    telegramWidgetRef.value.innerHTML = ''

    // Проверяем имя бота
    if (!props.botUsername || props.botUsername === 'your_bot_username') {
      console.warn('Bot username not configured properly:', props.botUsername)
      showFallback.value = true
      return
    }

    try {
      // Проверяем, не загружен ли уже скрипт
      const existingScript = document.querySelector('script[src*="telegram-widget.js"]')
      if (existingScript) {
        console.log('Removing existing Telegram script')
        existingScript.remove()
      }

      // Создаем script элемент для Telegram Widget
      const script = document.createElement('script')
      script.async = true
      script.src = 'https://telegram.org/js/telegram-widget.js?22'
      script.setAttribute('data-telegram-login', props.botUsername)
      script.setAttribute('data-size', props.buttonSize)
      script.setAttribute('data-corner-radius', props.cornerRadius.toString())
      script.setAttribute('data-request-access', props.requestAccess)
      script.setAttribute('data-userpic', props.userpic.toString())
      script.setAttribute('data-auth-url', props.authUrl)
      script.setAttribute('data-onauth', 'onTelegramAuth(user)')

      console.log('Created script element with attributes:', {
        src: script.src,
        'data-telegram-login': script.getAttribute('data-telegram-login'),
        'data-auth-url': script.getAttribute('data-auth-url')
      })

      // Обработчик загрузки
      script.onload = () => {
        console.log('✅ Telegram widget script loaded successfully')
        clearTimeout(loadTimeout.value)
        showFallback.value = false
      }

      script.onerror = (error) => {
        console.error('❌ Failed to load Telegram widget script:', error)
        console.log('Script src:', script.src)
        console.log('Bot username:', props.botUsername)
        console.log('Auth URL:', props.authUrl)
        console.log('Current URL:', window.location.href)
        clearTimeout(loadTimeout.value)
        showFallback.value = true
      }

      // Таймаут для показа fallback
      loadTimeout.value = setTimeout(() => {
        console.warn('⏰ Telegram widget loading timeout')
        showFallback.value = true
      }, 10000) // 10 секунд

      // Добавляем скрипт в виджет контейнер
      console.log('Appending script to widget container')
      telegramWidgetRef.value.appendChild(script)
      
    } catch (error) {
      console.error('Exception in loadTelegramWidget:', error)
      showFallback.value = true
    }
  }

  const reloadWidget = () => {
    showFallback.value = false
    loadTelegramWidget()
  }

  onMounted(() => {
    // Инициализируем только если не в Electron
    if (!isElectron.value) {
      // Добавляем небольшую задержку для правильной инициализации
      setTimeout(() => {
        setupTelegramCallback()
        loadTelegramWidget()
      }, 100)
    }
  })

  onUnmounted(() => {
    // Очищаем глобальную функцию
    if (window.onTelegramAuth) {
      delete window.onTelegramAuth
    }
    
    // Очищаем таймаут
    if (loadTimeout.value) {
      clearTimeout(loadTimeout.value)
    }
  })
</script>

<style scoped>
  .telegram-login-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 20px;
  }

  .telegram-widget-wrapper {
    display: flex;
    justify-content: center;
    min-height: 50px;
  }

  .telegram-login-widget {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .telegram-fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 400px;
    text-align: center;
  }

  .auth-loading {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }

  .mt-3 {
    margin-top: 12px;
  }

  /* Electron auth section */
  .electron-auth-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 20px;
  }

  .telegram-oauth-button {
    min-width: 240px;
    height: 50px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 25px;
    background: linear-gradient(135deg, #0088cc 0%, #005580 100%);
    border: none;
    box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3);
    transition: all 0.3s ease;
  }

  .telegram-oauth-button:hover {
    background: linear-gradient(135deg, #0099dd 0%, #006690 100%);
    box-shadow: 0 6px 16px rgba(0, 136, 204, 0.4);
    transform: translateY(-1px);
  }

  .telegram-oauth-button:active {
    transform: translateY(0);
  }

  .telegram-icon {
    margin-right: 8px;
    font-size: 20px;
  }

  .auth-hint {
    margin: 0;
    font-size: 14px;
    color: #666;
    text-align: center;
    max-width: 300px;
  }

  /* Стилизация под дизайн приложения */
  :deep(.telegram-login-widget iframe) {
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }
</style>