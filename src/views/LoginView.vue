<template>
  <div class="login-view">
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-section">
            <el-icon size="48" color="#409EFF">
              <Trophy />
            </el-icon>
            <h1 class="app-title">Мафия Helper</h1>
            <p class="app-subtitle">Система управления турнирами</p>
          </div>
        </div>

        <div class="login-content">
          <div class="auth-section">
            <h2 class="auth-title">Вход в систему</h2>
            <p class="auth-description">
              Войдите в систему через Telegram
            </p>

            <!-- Telegram Login Widget -->
            <div class="telegram-section">
              <TelegramLoginWidget
                :bot-username="telegramBotUsername"
                button-size="large"
                :corner-radius="8"
                request-access="write"
                :userpic="true"
              />
            </div>

            <!-- Тестовая авторизация (только в dev режиме) -->
            <div v-if="isDev" class="test-auth-section">
              <el-divider>или</el-divider>
              <el-button
                type="primary"
                plain
                @click="loginAsTestUser"
                :loading="isTestLogin"
              >
                <el-icon><User /></el-icon>
                Войти как тестовый пользователь
              </el-button>
            </div>

            <!-- Дополнительная информация -->
            <div class="auth-info">
              <el-alert
                title="Безопасная авторизация"
                description="Мы используем официальный виджет Telegram для безопасного входа. Ваши данные защищены."
                type="info"
                :closable="false"
                show-icon
              />
            </div>
          </div>
        </div>

        <div class="login-footer">
          <div class="footer-links">
            <router-link to="/" class="footer-link">
              <el-icon><House /></el-icon>
              На главную
            </router-link>
          </div>

          <div class="footer-info">
            <p class="copyright">
              © {{ currentYear }} Мафия Helper. Система управления турнирами по мафии.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed, ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'
  import TelegramLoginWidget from '@/components/auth/TelegramLoginWidget.vue'
  import { Trophy, House, User } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'

  const router = useRouter()
  const authStore = useAuthStore()

  // Конфигурация
  const telegramBotUsername = 'dev_mafia_joker_widget_bot' // Тестовый бот для проверки
  const currentYear = computed(() => new Date().getFullYear())
  const isDev = import.meta.env.DEV
  const isTestLogin = ref(false)

  // Перенаправляем авторизованных пользователей (после монтирования)
  onMounted(() => {
    if (authStore.isAuthenticated) {
      router.push('/')
    }
  })

  // Функция для тестовой авторизации
  const loginAsTestUser = async () => {
    isTestLogin.value = true

    try {
      // Эмулируем данные от Telegram для тестового пользователя
        const testUserData = {
            "telegram_id": 1903186808,
            "first_name": "Third",
            "last_name": "Child",
            "photo_url": "https://t.me/i/userpic/320/cEb6YEsbSrR70HNfx-deIs7QZjniHlA8q59HIxxyjv4.jpg",
            "auth_date": 1752423751,
            "nickname": "ShiranaiTenjouDa",
            "hash": "4db9e4ecef4a15d7015d3f605473da64106eb680df611448731692ed1f48e3ca"
      }

      console.log('Test user login:', testUserData)

      // Используем тот же метод авторизации
      const result = await authStore.telegramLogin(testUserData)

      if (result.success) {
        ElMessage.success('Вход выполнен как тестовый пользователь')
        router.push('/')
      } else {
        ElMessage.error(result.error || 'Ошибка тестовой авторизации')
      }
    } catch (error) {
      console.error('Test login error:', error)
      ElMessage.error('Ошибка при входе как тестовый пользователь')
    } finally {
      isTestLogin.value = false
    }
  }
</script>

<style scoped>
  .login-view {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .login-container {
    width: 100%;
    max-width: 480px;
  }

  .login-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .login-header {
    background: linear-gradient(135deg, #409EFF 0%, #36A2FF 100%);
    color: white;
    padding: 40px 30px;
    text-align: center;
  }

  .logo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .app-title {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  .app-subtitle {
    margin: 0;
    font-size: 16px;
    opacity: 0.9;
    font-weight: 400;
  }

  .login-content {
    padding: 40px 30px;
  }

  .auth-section {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .auth-title {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #303133;
    text-align: center;
  }

  .auth-description {
    margin: 0;
    font-size: 16px;
    color: #606266;
    text-align: center;
    line-height: 1.5;
  }

  .telegram-section {
    display: flex;
    justify-content: center;
    padding: 20px 0;
  }

  .test-auth-section {
    margin-top: 20px;
    text-align: center;
  }

  .test-auth-section .el-button {
    width: 100%;
    max-width: 300px;
  }

  .auth-info {
    margin-top: 20px;
  }

  .login-footer {
    background: #f8f9fa;
    padding: 24px 30px;
    border-top: 1px solid #ebeef5;
  }

  .footer-links {
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
  }

  .footer-link {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #606266;
    text-decoration: none;
    font-size: 14px;
    transition: color 0.3s;
  }

  .footer-link:hover {
    color: #409EFF;
  }

  .footer-info {
    text-align: center;
  }

  .copyright {
    margin: 0;
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .login-view {
      padding: 10px;
    }

    .login-content,
    .login-header,
    .login-footer {
      padding-left: 20px;
      padding-right: 20px;
    }

    .app-title {
      font-size: 24px;
    }

    .auth-title {
      font-size: 20px;
    }
  }

  @media (max-width: 480px) {
    .login-container {
      max-width: 100%;
    }

    .login-card {
      border-radius: 12px;
    }

    .login-header {
      padding: 30px 20px;
    }

    .login-content {
      padding: 30px 20px;
    }
  }
</style>
