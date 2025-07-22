<template>
  <el-card class="test-data-generator">
    <template #header>
      <div class="card-header">
        <el-icon><Tools /></el-icon>
        <span>Генератор тестовых данных</span>
      </div>
    </template>

    <div class="generator-content">
      <el-alert
        title="Внимание!"
        type="warning"
        description="Эта функция создаст тестовые мероприятия, столы и игры. Используйте только в режиме разработки."
        :closable="false"
        class="mb-4"
        show-icon
      />

      <el-form :model="form" label-width="200px" class="generation-form">
        <el-form-item label="Количество мероприятий">
          <el-input-number 
            v-model="form.eventsCount" 
            :min="1" 
            :max="10" 
            size="small"
          />
        </el-form-item>

        <el-form-item label="Столов на мероприятие">
          <el-slider 
            v-model="form.tablesPerEvent" 
            :min="2" 
            :max="6" 
            show-stops 
            show-input
          />
        </el-form-item>

        <el-form-item label="Игр на стол">
          <el-slider 
            v-model="form.gamesPerTable" 
            :min="3" 
            :max="12" 
            show-stops 
            show-input
          />
        </el-form-item>

        <el-form-item label="Создать пользователей">
          <el-switch 
            v-model="form.createUsers"
            active-text="Да"
            inactive-text="Нет"
          />
        </el-form-item>
      </el-form>

      <div class="generation-stats">
        <h4>Будет создано:</h4>
        <ul>
          <li><strong>{{ form.eventsCount }}</strong> мероприятий</li>
          <li><strong>{{ totalTables }}</strong> столов</li>
          <li><strong>{{ totalGames }}</strong> игр</li>
          <li v-if="form.createUsers"><strong>до 25</strong> пользователей</li>
        </ul>
      </div>

      <div class="generation-actions">
        <el-button 
          type="primary" 
          size="large"
          :loading="generating"
          @click="generateData"
          :disabled="generating"
        >
          <el-icon><Lightning /></el-icon>
          {{ generating ? 'Генерация...' : 'Сгенерировать данные' }}
        </el-button>

        <el-button 
          type="info" 
          size="large"
          :loading="generatingUsers"
          @click="generateUsersOnly"
          :disabled="generatingUsers || generating"
        >
          <el-icon><UserFilled /></el-icon>
          {{ generatingUsers ? 'Создание...' : 'Только пользователи' }}
        </el-button>
      </div>

      <!-- Лог генерации -->
      <div v-if="logs.length > 0" class="generation-logs">
        <h4>Лог генерации:</h4>
        <div class="logs-container">
          <div 
            v-for="(log, index) in logs" 
            :key="index" 
            class="log-entry"
            :class="log.type"
          >
            <el-icon v-if="log.type === 'success'"><Check /></el-icon>
            <el-icon v-if="log.type === 'error'"><Close /></el-icon>
            <el-icon v-if="log.type === 'info'"><InfoFilled /></el-icon>
            <span>{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import { 
      Tools, 
      Lightning, 
      UserFilled, 
      Check, 
      Close, 
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
      max-width: 800px;
      margin: 0 auto;
  }

  .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
  }

  .generator-content {
      padding: 16px 0;
  }

  .generation-form {
      margin-bottom: 24px;
  }

  .generation-stats {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 24px;
  }

  .generation-stats h4 {
      margin: 0 0 12px 0;
      color: #495057;
  }

  .generation-stats ul {
      margin: 0;
      padding-left: 20px;
  }

  .generation-stats li {
      margin-bottom: 4px;
      color: #6c757d;
  }

  .generation-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-bottom: 24px;
  }

  .generation-logs {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #ebeef5;
  }

  .generation-logs h4 {
      margin: 0 0 16px 0;
      color: #303133;
  }

  .logs-container {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      padding: 12px;
      background: #fafafa;
  }

  .log-entry {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.4;
  }

  .log-entry:last-child {
      margin-bottom: 0;
  }

  .log-entry.success {
      color: #67c23a;
  }

  .log-entry.error {
      color: #f56c6c;
  }

  .log-entry.info {
      color: #409eff;
  }

  .mb-4 {
      margin-bottom: 16px;
  }
</style>