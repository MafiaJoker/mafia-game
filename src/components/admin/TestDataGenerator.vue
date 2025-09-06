<template>
  <div class="test-data-generator">
    <!-- Главный заголовок -->
    <div class="generator-header">
      <div class="header-icon">
        <el-icon><DataAnalysis /></el-icon>
      </div>
      <div class="header-content">
        <h2>Генератор тестовых данных</h2>
        <p>Создайте полные наборы данных для тестирования приложения</p>
      </div>
    </div>

    <!-- Основной контент -->
    <div class="generator-body">
      <!-- Панель настроек -->
      <el-card class="settings-panel">
        <template #header>
          <div class="panel-header">
            <el-icon><Setting /></el-icon>
            <span>Параметры генерации</span>
          </div>
        </template>

        <div class="settings-grid">
          <!-- Мероприятия -->
          <div class="setting-item">
            <div class="setting-header">
              <el-icon class="setting-icon"><Calendar /></el-icon>
              <div class="setting-info">
                <h4>Мероприятия</h4>
                <span class="setting-desc">Количество создаваемых мероприятий</span>
              </div>
            </div>
            <el-input-number 
              v-model="form.eventsCount" 
              :min="1" 
              :max="10" 
              size="large"
              class="setting-control"
            />
          </div>

          <!-- Столы -->
          <div class="setting-item">
            <div class="setting-header">
              <el-icon class="setting-icon"><Grid /></el-icon>
              <div class="setting-info">
                <h4>Столы</h4>
                <span class="setting-desc">Количество столов на мероприятие</span>
              </div>
            </div>
            <div class="setting-control">
              <el-slider 
                v-model="form.tablesPerEvent" 
                :min="2" 
                :max="6" 
                show-input
                input-size="large"
              />
            </div>
          </div>

          <!-- Игры -->
          <div class="setting-item">
            <div class="setting-header">
              <el-icon class="setting-icon"><VideoPlay /></el-icon>
              <div class="setting-info">
                <h4>Игры</h4>
                <span class="setting-desc">Количество игр на каждый стол</span>
              </div>
            </div>
            <div class="setting-control">
              <el-slider 
                v-model="form.gamesPerTable" 
                :min="3" 
                :max="12" 
                show-input
                input-size="large"
              />
            </div>
          </div>

          <!-- Пользователи -->
          <div class="setting-item">
            <div class="setting-header">
              <el-icon class="setting-icon"><UserFilled /></el-icon>
              <div class="setting-info">
                <h4>Пользователи</h4>
                <span class="setting-desc">Создавать тестовых пользователей</span>
              </div>
            </div>
            <el-switch 
              v-model="form.createUsers"
              size="large"
              active-text="Да"
              inactive-text="Нет"
              class="setting-control"
            />
          </div>
        </div>
      </el-card>

      <!-- Превью результатов -->
      <el-card class="preview-panel">
        <template #header>
          <div class="panel-header">
            <el-icon><View /></el-icon>
            <span>Превью результатов</span>
          </div>
        </template>

        <div class="preview-stats">
          <div class="stat-card">
            <div class="stat-icon events">
              <el-icon><Calendar /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ form.eventsCount }}</div>
              <div class="stat-label">Мероприятий</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon tables">
              <el-icon><Grid /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ totalTables }}</div>
              <div class="stat-label">Столов</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon games">
              <el-icon><VideoPlay /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ totalGames }}</div>
              <div class="stat-label">Игр</div>
            </div>
          </div>

          <div v-if="form.createUsers" class="stat-card">
            <div class="stat-icon users">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">~25</div>
              <div class="stat-label">Пользователей</div>
            </div>
          </div>
        </div>

        <el-alert
          type="warning"
          :closable="false"
          class="preview-warning"
        >
          <template #title>
            <el-icon><WarningFilled /></el-icon>
            Используйте только в разработке
          </template>
          Эта операция создаст большое количество тестовых данных. Не используйте на продакшене.
        </el-alert>
      </el-card>

      <!-- Кнопки действий -->
      <div class="action-panel">
        <el-button 
          type="primary" 
          size="large"
          :loading="generating"
          @click="generateData"
          :disabled="generating || generatingUsers"
          class="action-button primary"
        >
          <template #loading>
            <el-icon class="is-loading"><Loading /></el-icon>
          </template>
          <template #icon>
            <el-icon><Lightning /></el-icon>
          </template>
          {{ generating ? 'Генерируем данные...' : 'Запустить генерацию' }}
        </el-button>

        <el-button 
          type="info" 
          size="large"
          :loading="generatingUsers"
          @click="generateUsersOnly"
          :disabled="generatingUsers || generating"
          class="action-button secondary"
        >
          <template #loading>
            <el-icon class="is-loading"><Loading /></el-icon>
          </template>
          <template #icon>
            <el-icon><UserFilled /></el-icon>
          </template>
          {{ generatingUsers ? 'Создаём пользователей...' : 'Создать пользователей' }}
        </el-button>
      </div>

      <!-- Лог генерации -->
      <el-card v-if="logs.length > 0" class="logs-panel">
        <template #header>
          <div class="panel-header">
            <el-icon><Document /></el-icon>
            <span>Лог выполнения</span>
            <el-button 
              size="small" 
              type="text" 
              @click="clearLogs"
              class="clear-logs-btn"
            >
              <el-icon><Delete /></el-icon>
              Очистить
            </el-button>
          </div>
        </template>

        <div class="logs-container">
          <transition-group name="log" tag="div">
            <div 
              v-for="(log, index) in logs" 
              :key="index" 
              class="log-entry"
              :class="log.type"
            >
              <div class="log-icon">
                <el-icon v-if="log.type === 'success'"><CircleCheck /></el-icon>
                <el-icon v-if="log.type === 'error'"><CircleClose /></el-icon>
                <el-icon v-if="log.type === 'info'"><InfoFilled /></el-icon>
              </div>
              <div class="log-content">
                <span class="log-message">{{ log.message }}</span>
                <span class="log-time">{{ log.timestamp }}</span>
              </div>
            </div>
          </transition-group>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import { 
      DataAnalysis,
      Setting,
      Calendar,
      Grid,
      VideoPlay,
      UserFilled,
      View,
      WarningFilled,
      Lightning,
      Loading,
      Document,
      Delete,
      CircleCheck,
      CircleClose,
      InfoFilled
  } from '@element-plus/icons-vue'
  import { generateTestData, generateUsers } from '@/utils/generateTestData'

  const generating = ref(false)
  const generatingUsers = ref(false)
  const logs = ref([])

  const form = ref({
      eventsCount: 3,
      tablesPerEvent: 3,
      gamesPerTable: 5,
      createUsers: true
  })

  // Вычисляемые значения
  const totalTables = computed(() => form.value.eventsCount * form.value.tablesPerEvent)
  const totalGames = computed(() => totalTables.value * form.value.gamesPerTable)

  // Добавление лога
  const addLog = (message, type = 'info') => {
      logs.value.push({
          message,
          type,
          timestamp: new Date().toLocaleTimeString()
      })
  }

  // Очистка логов
  const clearLogs = () => {
      logs.value = []
  }

  // Основная генерация данных
  const generateData = async () => {
      if (generating.value) return

      generating.value = true
      clearLogs()

      try {
          addLog('🚀 Начинаем генерацию тестовых данных...', 'info')

          const result = await generateTestData({
              eventsCount: form.value.eventsCount,
              tablesPerEvent: form.value.tablesPerEvent,
              gamesPerTable: form.value.gamesPerTable,
              createUsers: form.value.createUsers
          })

          if (result.success) {
              addLog(`✅ ${result.message}`, 'success')
              ElMessage.success('Тестовые данные успешно созданы!')
              
              // Обновляем страницу через 2 секунды
              setTimeout(() => {
                  window.location.reload()
              }, 2000)
          } else {
              addLog(`❌ Ошибка: ${result.error}`, 'error')
              ElMessage.error(`Ошибка генерации: ${result.error}`)
          }

      } catch (error) {
          console.error('Ошибка генерации:', error)
          addLog(`❌ Неожиданная ошибка: ${error.message}`, 'error')
          ElMessage.error('Произошла неожиданная ошибка')
      } finally {
          generating.value = false
      }
  }

  // Генерация только пользователей
  const generateUsersOnly = async () => {
      if (generatingUsers.value) return

      generatingUsers.value = true
      clearLogs()

      try {
          addLog('👥 Создаем тестовых пользователей...', 'info')

          await generateUsers()
          
          addLog('✅ Пользователи успешно созданы', 'success')
          ElMessage.success('Тестовые пользователи созданы!')

      } catch (error) {
          console.error('Ошибка создания пользователей:', error)
          addLog(`❌ Ошибка создания пользователей: ${error.message}`, 'error')
          ElMessage.error('Ошибка создания пользователей')
      } finally {
          generatingUsers.value = false
      }
  }
</script>

<style scoped>
.test-data-generator {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* Главный заголовок */
.generator-header {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 32px;
  padding: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
}

.header-icon {
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  flex-shrink: 0;
}

.header-content h2 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
}

.header-content p {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
  line-height: 1.5;
}

/* Основное содержимое */
.generator-body {
  display: grid;
  gap: 24px;
}

/* Панель настроек */
.settings-panel {
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #2c3e50;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 16px;
}

.setting-item {
  padding: 20px;
  border: 2px solid #f1f3f4;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.setting-item:hover {
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
}

.setting-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.setting-icon {
  width: 40px;
  height: 40px;
  background: #f8f9fa;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #409eff;
  flex-shrink: 0;
}

.setting-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.setting-desc {
  font-size: 14px;
  color: #7f8c8d;
  line-height: 1.4;
}

.setting-control {
  width: 100%;
}

/* Превью панель */
.preview-panel {
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}

.preview-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8f9ff;
  border: 2px solid #e8ecff;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.stat-icon.events {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-icon.tables {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.stat-icon.games {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.stat-icon.users {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #7f8c8d;
  margin-top: 4px;
}

.preview-warning {
  border-radius: 8px;
}

/* Кнопки действий */
.action-panel {
  display: flex;
  gap: 16px;
  justify-content: center;
  padding: 24px;
}

.action-button {
  min-width: 200px;
  height: 56px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.action-button.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
}

.action-button.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.action-button.secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border: none;
  color: white;
}

.action-button.secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(240, 147, 251, 0.4);
}

/* Логи */
.logs-panel {
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}

.clear-logs-btn {
  margin-left: auto;
}

.logs-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #e8ecf0;
}

.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: white;
  border-radius: 8px;
  border-left: 4px solid #e8ecf0;
  transition: all 0.3s ease;
}

.log-entry:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.log-entry.success {
  border-left-color: #67c23a;
  background: #f7fff7;
}

.log-entry.error {
  border-left-color: #f56c6c;
  background: #fff7f7;
}

.log-entry.info {
  border-left-color: #409eff;
  background: #f7fbff;
}

.log-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 2px;
}

.log-entry.success .log-icon {
  color: #67c23a;
}

.log-entry.error .log-icon {
  color: #f56c6c;
}

.log-entry.info .log-icon {
  color: #409eff;
}

.log-content {
  flex: 1;
  min-width: 0;
}

.log-message {
  display: block;
  font-size: 14px;
  line-height: 1.4;
  color: #2c3e50;
  margin-bottom: 4px;
}

.log-time {
  font-size: 12px;
  color: #95a5a6;
}

/* Анимации */
.log-enter-active {
  transition: all 0.3s ease;
}

.log-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.log-enter-to {
  opacity: 1;
  transform: translateX(0);
}

/* Адаптивность */
@media (max-width: 768px) {
  .test-data-generator {
    padding: 16px;
  }
  
  .generator-header {
    flex-direction: column;
    text-align: center;
    padding: 24px;
  }
  
  .header-icon {
    align-self: center;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .preview-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .action-panel {
    flex-direction: column;
  }
  
  .action-button {
    width: 100%;
  }
}
</style>