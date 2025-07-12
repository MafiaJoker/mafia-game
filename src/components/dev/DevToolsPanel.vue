<template>
  <div v-if="isDev" class="dev-tools-panel">
    <el-card class="dev-card" shadow="hover">
      <template #header>
        <div class="dev-header">
          <el-icon><Tools /></el-icon>
          <span>Инструменты разработчика</span>
          <el-button
            link
            size="small"
            @click="collapsed = !collapsed"
            >
            {{ collapsed ? '▲' : '▼' }}
          </el-button>
        </div>
      </template>

      <div v-show="!collapsed" class="dev-content">
        <!-- Быстрые действия -->
        <div class="section">
          <h4>⚡ Быстрые действия</h4>
          <div class="button-group">
            <el-button 
              type="primary" 
              size="small"
              @click="quickSeed"
              :loading="loading.quick"
              >
              Быстрое создание
            </el-button>
            
            <el-button 
              type="danger" 
              size="small"
              @click="cleanAll"
              :loading="loading.clean"
              >
              Очистить всё
            </el-button>
          </div>
        </div>

        <!-- Создание данных -->
        <div class="section">
          <h4>🌱 Создание тестовых данных</h4>
          
          <div class="subsection">
            <span class="label">Профиль:</span>
            <el-radio-group v-model="selectedProfile" size="small">
              <el-radio value="minimal">Минимальный</el-radio>
              <el-radio value="full">Полный</el-radio>
              <el-radio value="stress">Стресс-тест</el-radio>
            </el-radio-group>
          </div>

          <div class="button-group">
            <el-button 
              type="success" 
              size="small"
              @click="seedAll"
              :loading="loading.all"
              >
              Всё ({{ getProfileDescription(selectedProfile) }})
            </el-button>
            
            <el-button 
              size="small"
              @click="seedEvents"
              :loading="loading.events"
              >
              Мероприятия
            </el-button>
            
            <el-button 
              size="small"
              @click="seedGames"
              :loading="loading.games"
              >
              Игры
            </el-button>
            
            <el-button 
              size="small"
              @click="seedUsers"
              :loading="loading.users"
              >
              Пользователи
            </el-button>
          </div>
        </div>

        <!-- Одиночные создания -->
        <div class="section">
          <h4>🎯 Одиночные создания</h4>
          <div class="button-group">
            <el-button 
              type="primary" 
              size="small"
              @click="createTestEvent"
              :loading="loading.testEvent"
              >
              Тестовое мероприятие
            </el-button>
            
            <el-button 
              type="primary" 
              size="small"
              @click="createTestGame"
              :loading="loading.testGame"
              >
              Тестовая игра
            </el-button>
            
            <el-button 
              type="primary" 
              size="small"
              @click="createTestUser"
              :loading="loading.testUser"
              >
              Тестовый пользователь
            </el-button>
          </div>
        </div>

        <!-- Статистика -->
        <div class="section">
          <h4>📊 Статистика</h4>
          <div class="stats">
            <div class="stat-item">
              <span class="stat-label">API:</span>
              <el-tag :type="apiStatus === 'online' ? 'success' : 'danger'" size="small">
                {{ apiStatus === 'online' ? 'Онлайн' : 'Офлайн' }}
              </el-tag>
              <el-button 
                link 
                size="small"
                @click="checkApiStatus"
                :loading="loading.apiCheck"
                >
                Обновить
              </el-button>
            </div>
            
            <div class="stat-item">
              <span class="stat-label">Мероприятий:</span>
              <span class="stat-value">{{ stats.events }}</span>
            </div>
            
            <div class="stat-item">
              <span class="stat-label">Игр:</span>
              <span class="stat-value">{{ stats.games }}</span>
            </div>
            
            <div class="stat-item">
              <span class="stat-label">Пользователей:</span>
              <span class="stat-value">{{ stats.users }}</span>
            </div>
          </div>
        </div>

        <!-- Логи -->
        <div v-if="logs.length > 0" class="section">
          <h4>📋 Последние действия</h4>
          <div class="logs">
            <div 
              v-for="log in logs.slice(-3)" 
              :key="log.id"
              class="log-item"
              :class="log.type"
              >
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
          <el-button 
            link 
            size="small"
            @click="clearLogs"
            >
            Очистить логи
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
  import { ref, reactive, onMounted, computed } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Tools } from '@element-plus/icons-vue'
  import { 
    seedAll as seedAllData, 
    cleanAll as cleanAllData, 
    quickSeed as quickSeedData,
    EventSeeder, 
    GameSeeder, 
    UserSeeder 
  } from '@/utils/seeders/index.js'
  import { apiService } from '@/services/api.js'

  // Проверяем, что мы в режиме разработки
  const isDev = computed(() => {
    return import.meta.env.DEV || import.meta.env.MODE === 'development'
  })

  const collapsed = ref(false)
  const selectedProfile = ref('minimal')
  const apiStatus = ref('unknown')

  const loading = reactive({
    quick: false,
    clean: false,
    all: false,
    events: false,
    games: false,
    users: false,
    testEvent: false,
    testGame: false,
    testUser: false,
    apiCheck: false
  })

  const stats = reactive({
    events: 0,
    games: 0,
    users: 0
  })

  const logs = ref([])
  let logId = 0

  // Добавление лога
  const addLog = (message, type = 'info') => {
    logs.value.push({
      id: ++logId,
      message,
      type,
      timestamp: new Date()
    })
  }

  // Получение описания профиля
  const getProfileDescription = (profile) => {
    const descriptions = {
      minimal: '2 мероприятия, 1 игра, 5 пользователей',
      full: '5 мероприятий, 3 игры, 20 пользователей',
      stress: '20 мероприятий, 10 игр, 100 пользователей'
    }
    return descriptions[profile] || 'Неизвестный профиль'
  }

  // Форматирование времени
  const formatTime = (date) => {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Проверка статуса API
  const checkApiStatus = async () => {
    loading.apiCheck = true
    try {
      await apiService.getEvents()
      apiStatus.value = 'online'
      addLog('API доступно', 'success')
    } catch (error) {
      apiStatus.value = 'offline'
      addLog(`API недоступно: ${error.message}`, 'error')
    } finally {
      loading.apiCheck = false
    }
    
    await updateStats()
  }

  // Обновление статистики
  const updateStats = async () => {
    try {
      const [events, games, users] = await Promise.all([
        apiService.getEvents().catch(() => []),
        apiService.getGames().catch(() => []),
        apiService.getUsers().catch(() => [])
      ])
      
      stats.events = events.length || 0
      stats.games = games.length || 0
      stats.users = users.length || 0
    } catch (error) {
      console.warn('Ошибка обновления статистики:', error)
    }
  }

  // Быстрое создание
  const quickSeed = async () => {
    loading.quick = true
    try {
      addLog('Запуск быстрого создания...', 'info')
      const result = await quickSeedData()
      
      if (result.success) {
        addLog('Быстрое создание завершено', 'success')
        ElMessage.success('Тестовые данные созданы!')
      } else {
        addLog(`Ошибка: ${result.error}`, 'error')
        ElMessage.error('Ошибка создания данных')
      }
    } catch (error) {
      addLog(`Критическая ошибка: ${error.message}`, 'error')
      ElMessage.error('Критическая ошибка')
    } finally {
      loading.quick = false
      await updateStats()
    }
  }

  // Полная очистка
  const cleanAll = async () => {
    try {
      await ElMessageBox.confirm(
        'Вы уверены, что хотите удалить ВСЕ тестовые данные?',
        'Подтверждение очистки',
        {
          confirmButtonText: 'Да, удалить',
          cancelButtonText: 'Отмена',
          type: 'warning'
        }
      )

      loading.clean = true
      addLog('Запуск полной очистки...', 'info')
      
      const result = await cleanAllData()
      
      if (result.success) {
        addLog('Очистка завершена', 'success')
        ElMessage.success('Все данные удалены!')
      } else {
        addLog(`Ошибка очистки: ${result.error}`, 'error')
        ElMessage.error('Ошибка при очистке данных')
      }
    } catch (error) {
      if (error !== 'cancel') {
        addLog(`Критическая ошибка: ${error.message}`, 'error')
        ElMessage.error('Критическая ошибка при очистке')
      }
    } finally {
      loading.clean = false
      await updateStats()
    }
  }

  // Создание всех данных
  const seedAll = async () => {
    loading.all = true
    try {
      addLog(`Создание всех данных (${selectedProfile.value})...`, 'info')
      const result = await seedAllData(selectedProfile.value)
      
      if (result.success) {
        addLog(`Создание завершено: ${result.totalSuccess} операций`, 'success')
        ElMessage.success(`Все данные созданы! (${result.totalSuccess} операций)`)
      } else {
        addLog(`Ошибки: ${result.totalErrors}`, 'error')
        ElMessage.warning(`Создание с ошибками: ${result.totalErrors}`)
      }
    } catch (error) {
      addLog(`Критическая ошибка: ${error.message}`, 'error')
      ElMessage.error('Критическая ошибка')
    } finally {
      loading.all = false
      await updateStats()
    }
  }

  // Создание мероприятий
  const seedEvents = async () => {
    loading.events = true
    try {
      addLog('Создание мероприятий...', 'info')
      const seeder = new EventSeeder(selectedProfile.value)
      const result = await seeder.safeRun('seed')
      
      if (result) {
        addLog(`Мероприятия созданы: ${seeder.success.length}`, 'success')
        ElMessage.success(`Создано мероприятий: ${seeder.success.length}`)
      }
    } catch (error) {
      addLog(`Ошибка: ${error.message}`, 'error')
      ElMessage.error('Ошибка создания мероприятий')
    } finally {
      loading.events = false
      await updateStats()
    }
  }

  // Создание игр
  const seedGames = async () => {
    loading.games = true
    try {
      addLog('Создание игр...', 'info')
      const seeder = new GameSeeder(selectedProfile.value)
      const result = await seeder.safeRun('seed')
      
      if (result) {
        addLog(`Игры созданы: ${seeder.success.length}`, 'success')
        ElMessage.success(`Создано игр: ${seeder.success.length}`)
      }
    } catch (error) {
      addLog(`Ошибка: ${error.message}`, 'error')
      ElMessage.error('Ошибка создания игр')
    } finally {
      loading.games = false
      await updateStats()
    }
  }

  // Создание пользователей
  const seedUsers = async () => {
    loading.users = true
    try {
      addLog('Создание пользователей...', 'info')
      const seeder = new UserSeeder(selectedProfile.value)
      const result = await seeder.safeRun('seed')
      
      if (result) {
        addLog(`Пользователи созданы: ${seeder.success.length}`, 'success')
        ElMessage.success(`Создано пользователей: ${seeder.success.length}`)
      }
    } catch (error) {
      addLog(`Ошибка: ${error.message}`, 'error')
      ElMessage.error('Ошибка создания пользователей')
    } finally {
      loading.users = false
      await updateStats()
    }
  }

  // Одиночные создания
  const createTestEvent = async () => {
    loading.testEvent = true
    try {
      const seeder = new EventSeeder()
      const event = await seeder.createTestEvent()
      addLog(`Создано мероприятие: ${event.name}`, 'success')
      ElMessage.success(`Создано мероприятие: ${event.name}`)
    } catch (error) {
      addLog(`Ошибка: ${error.message}`, 'error')
      ElMessage.error('Ошибка создания мероприятия')
    } finally {
      loading.testEvent = false
      await updateStats()
    }
  }

  const createTestGame = async () => {
    loading.testGame = true
    try {
      const seeder = new GameSeeder()
      const game = await seeder.createTestGame()
      addLog(`Создана игра: ${game.name}`, 'success')
      ElMessage.success(`Создана игра: ${game.name}`)
    } catch (error) {
      addLog(`Ошибка: ${error.message}`, 'error')
      ElMessage.error('Ошибка создания игры')
    } finally {
      loading.testGame = false
      await updateStats()
    }
  }

  const createTestUser = async () => {
    loading.testUser = true
    try {
      const seeder = new UserSeeder()
      const user = await seeder.createTestUser()
      addLog(`Создан пользователь: ${user.nickname}`, 'success')
      ElMessage.success(`Создан пользователь: ${user.nickname}`)
    } catch (error) {
      addLog(`Ошибка: ${error.message}`, 'error')
      ElMessage.error('Ошибка создания пользователя')
    } finally {
      loading.testUser = false
      await updateStats()
    }
  }

  const clearLogs = () => {
    logs.value = []
    addLog('Логи очищены', 'info')
  }

  onMounted(() => {
    checkApiStatus()
  })
</script>

<style scoped>
  .dev-tools-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    width: 400px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .dev-card {
    border: 2px solid #409eff;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
  }

  .dev-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #409eff;
  }

  .dev-content {
    max-height: 60vh;
    overflow-y: auto;
  }

  .section {
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;
  }

  .section:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  .section h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #606266;
  }

  .subsection {
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .label {
    font-size: 12px;
    color: #909399;
    white-space: nowrap;
  }

  .button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .stats {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  .stat-label {
    color: #909399;
    min-width: 80px;
  }

  .stat-value {
    font-weight: 600;
    color: #303133;
  }

  .logs {
    max-height: 120px;
    overflow-y: auto;
    background: #f5f7fa;
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 8px;
  }

  .log-item {
    display: flex;
    gap: 8px;
    font-size: 11px;
    margin-bottom: 4px;
    padding: 2px 4px;
    border-radius: 2px;
  }

  .log-item.success {
    background: #f0f9ff;
    color: #529b2e;
  }

  .log-item.error {
    background: #fef0f0;
    color: #f56c6c;
  }

  .log-item.info {
    background: #f4f4f5;
    color: #606266;
  }

  .log-time {
    color: #909399;
    white-space: nowrap;
  }

  .log-message {
    flex: 1;
  }

  /* Скрыть панель на мобильных устройствах */
  @media (max-width: 768px) {
    .dev-tools-panel {
      display: none;
    }
  }
</style>