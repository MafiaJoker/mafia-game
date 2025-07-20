<template>
  <div class="event-view">
    <el-container>
      <el-header>
        <div class="event-header">
          <el-button 
            @click="$router.push('/')"
            :icon="ArrowLeft"
            >
            Назад к мероприятиям
          </el-button>
          <h1>{{ event?.label || 'Загрузка мероприятия...' }}</h1>
        </div>
      </el-header>

      <el-main>
        <el-row :gutter="20">
          <!-- Информация о мероприятии -->
          <el-col :md="8">
            <el-card class="mb-4">
              <template #header>
                <div class="card-header">
                  <el-icon><InfoFilled /></el-icon>
                  <span>Информация о мероприятии</span>
                </div>
              </template>

              <div v-if="event" class="event-info">
                <div class="info-item" v-if="event.event_type">
                  <el-tag 
                    class="mb-2"
                    :style="{ 
                      backgroundColor: event.event_type.color || '#409eff', 
                      color: 'white',
                      border: 'none'
                    }"
                  >
                    {{ event.event_type.label }}
                  </el-tag>
                </div>

                <div class="info-item">
                  <h6>Описание:</h6>
                  <p>{{ event.description || 'Описание отсутствует' }}</p>
                </div>

                <div class="info-item">
                  <h6>Дата проведения:</h6>
                  <p>{{ formatDate(event.start_date) }}</p>
                </div>

                <div class="info-item">
                  <h6>Язык:</h6>
                  <p>{{ getLanguageLabel(event.language) }}</p>
                </div>

                <div class="info-item">
                  <h6>Столы:</h6>
                  <p>{{ tableCount }} {{ getTableNoun(tableCount) }}</p>
                </div>
              </div>

              <el-skeleton v-else :rows="5" animated />
            </el-card>

            <!-- Список столов -->
            <el-card>
              <template #header>
                <div class="card-header">
                  <div class="header-left">
                    <el-icon><Grid /></el-icon>
                    <span>Игровые столы</span>
                  </div>
                  <el-button 
                    type="primary" 
                    size="small"
                    @click="createNewTable"
                    >
                    <el-icon><Plus /></el-icon>
                    Добавить стол
                  </el-button>
                </div>
              </template>

              <div v-if="event">
                <div v-if="tableCount === 0" class="no-tables">
                  <el-empty description="У этого мероприятия нет столов" />
                </div>

                <div v-else class="tables-list">
                  <div
                    v-for="(table, index) in tables"
                    :key="index"
                    class="table-item"
                    :class="{ active: selectedTable === table, virtual: table.isVirtual }"
                    @click="selectTable(table)"
                    >
                    <div class="table-content">
                      <div class="table-name">
                        {{ table.table_name }}
                        <el-tag 
                          v-if="table.isVirtual" 
                          type="warning" 
                          size="small" 
                          class="ml-2"
                        >
                          Временный
                        </el-tag>
                      </div>
                      <div v-if="table.game_masters && table.game_masters.length > 0" class="table-masters">
                        <small class="text-muted">Судьи:</small>
                        <div v-for="master in table.game_masters" :key="master.id" class="master-name">
                          {{ master.nickname }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <el-skeleton v-else :rows="3" animated />
            </el-card>
          </el-col>

          <!-- Детали стола -->
          <el-col :md="16">
            <el-card>
              <template #header>
                <div class="card-header">
                  <el-icon><InfoFilled /></el-icon>
                  <span>{{ selectedTable ? selectedTable.table_name : 'Выберите стол' }}</span>
                  <el-button 
                    v-if="selectedTable && event?.status !== 'completed'"
                    type="success" 
                    size="small"
                    @click="createNewGame"
                    >
                    <el-icon><Plus /></el-icon>
                    Новая игра
                  </el-button>
                </div>
              </template>

              <div v-if="!selectedTable" class="no-selection">
                <el-empty description="Выберите стол из списка слева">
                  <template #image>
                    <el-icon size="100" color="#c0c4cc">
                      <InfoFilled />
                    </el-icon>
                  </template>
                </el-empty>
              </div>

              <div v-else class="table-details">
                <!-- Предупреждение для виртуальных столов -->
                <el-alert
                  v-if="selectedTable.isVirtual"
                  title="Временный стол"
                  type="warning"
                  description="Этот стол будет сохранен только после создания первой игры на нем. До этого момента стол будет пропадать при обновлении страницы."
                  :closable="false"
                  class="mb-4"
                />

                <!-- Информация о столе -->
                <div class="table-info mb-4">
                  <el-descriptions :column="2" border>
                    <el-descriptions-item label="Название">
                      {{ selectedTable.table_name }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Судьи" v-if="selectedTable.game_masters && selectedTable.game_masters.length > 0">
                      <span v-for="(master, idx) in selectedTable.game_masters" :key="master.id">
                        {{ master.nickname }}<span v-if="idx < selectedTable.game_masters.length - 1">, </span>
                      </span>
                    </el-descriptions-item>
                    <el-descriptions-item label="Количество игр">
                      {{ games.length }}
                    </el-descriptions-item>
                  </el-descriptions>
                </div>

                <!-- Игры стола -->
                <div class="games-section">
                  <h5 class="section-title">Игры</h5>

                  <div v-if="games.length === 0" class="no-games">
                    <el-empty description="У этого стола еще нет игр" />
                  </div>

                  <div v-else class="games-list">
                    <div 
                      v-for="game in games"
                      :key="game.id"
                      class="game-item"
                      >
                      <div class="game-main-content">
                        <div class="game-title-row">
                          <h6 class="game-name">{{ game.label }}</h6>
                          <span class="game-datetime">{{ formatDateTime(game.started_at) }}</span>
                        </div>
                        
                        <div class="game-details-row">
                          <div class="game-meta">
                            <span v-if="game.game_master" class="game-master">
                              Судья: {{ game.game_master.nickname }}
                            </span>
                          </div>
                          
                          <div class="game-status">
                            <el-tag v-if="game.result" :type="getResultType(game.result)" size="small">
                              {{ getResultLabel(game.result) }}
                            </el-tag>
                          </div>
                        </div>
                      </div>
                      
                      <div class="game-actions">
                        <el-button 
                          type="primary" 
                          size="small"
                          @click="openGame(game.id)"
                          >
                          Войти
                        </el-button>
                        <el-button 
                          type="danger" 
                          size="small" 
                          circle
                          @click="deleteGame(game.id)"
                          >
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>



  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useEventsStore } from '@/stores/events'
  import { apiService } from '@/services/api'
  import { ElMessage } from 'element-plus'
  import { 
      ArrowLeft, 
      InfoFilled,
      Plus,
      Delete,
      Grid
  } from '@element-plus/icons-vue'

  const route = useRoute()
  const router = useRouter()
  const eventsStore = useEventsStore()

  const event = ref(null)
  const selectedTable = ref(null)
  const games = ref([])
  const virtualTables = ref([])

  const tables = computed(() => {
    const realTables = event.value?.tables || []
    return [...realTables, ...virtualTables.value]
  })

  const tableCount = computed(() => {
    return tables.value.length
  })

  const selectTable = (table) => {
    selectedTable.value = table
    games.value = table.games || []
  }


  const openGame = (gameId) => {
    const eventId = route.params.id
    const tableIndex = tables.value.indexOf(selectedTable.value) + 1
    router.push(`/game?eventId=${eventId}&tableId=${tableIndex}&gameId=${gameId}`)
  }

  const deleteGame = async (gameId) => {
    try {
      await apiService.updateGame(gameId, { is_hidden: true })
      // Удаляем игру из локального состояния
      if (selectedTable.value && selectedTable.value.games) {
        selectedTable.value.games = selectedTable.value.games.filter(game => game.id !== gameId)
        games.value = selectedTable.value.games
      }
      ElMessage.success('Игра скрыта!')
    } catch (error) {
      console.error('Ошибка при скрытии игры:', error)
      ElMessage.error('Не удалось скрыть игру')
    }
  }

  const createNewTable = () => {
    const tableNumber = tables.value.length + 1
    
    // Используем template из события, или "Стол {}" по умолчанию
    const template = event.value?.table_name_template || 'Стол {}'
    const tableName = template.replace('{}', tableNumber)
    
    const newTable = {
      table_name: tableName,
      game_masters: [],
      games: [],
      isVirtual: true
    }
    
    virtualTables.value.push(newTable)
    selectTable(newTable)
    ElMessage.success('Стол создан!')
  }

  const createNewGame = async () => {
    if (!selectedTable.value) {
      ElMessage.error('Выберите стол для создания игры')
      return
    }

    try {
      const gameNumber = (selectedTable.value.games?.length || 0) + 1
      const tableId = tables.value.indexOf(selectedTable.value) + 1
      
      const gameData = {
        label: `Игра #${gameNumber}`,
        event_id: route.params.id,
        table_id: tableId
      }
      
      const newGame = await apiService.createGame(gameData)
      
      if (!selectedTable.value.games) {
        selectedTable.value.games = []
      }
      selectedTable.value.games.push(newGame)
      games.value = selectedTable.value.games
      
      ElMessage.success('Игра создана!')
    } catch (error) {
      console.error('Ошибка создания игры:', error)
      ElMessage.error('Ошибка при создании игры')
    }
  }



  const loadEvent = async () => {
      try {
	  const eventId = route.params.id  // Убираем parseInt, чтобы сохранить UUID
	  console.log('Loading event with ID:', eventId)
	  console.log('Route params:', route.params)
	  event.value = await apiService.getEvent(eventId)
	  console.log('Event loaded:', event.value)
	  
	  // Автоматически выбираем первый стол, если есть столы
	  if (tables.value.length > 0) {
	    selectTable(tables.value[0])
	  }
      } catch (error) {
	  console.error('Error loading event:', error)
	  ElMessage.error(`Ошибка загрузки мероприятия: ${error.message}`)
	  router.push('/')
      }
  }

  // Вспомогательные функции

  const getLanguageLabel = (language) => {
      const labels = {
	  'ru': 'Русский',
	  'en': 'English',
	  'am': 'Հայերեն'
      }
      return labels[language] || 'Русский'
  }

  const getTableNoun = (count) => {
      const n = Math.abs(count) % 100
      if (n >= 5 && n <= 20) return 'столов'
      
      const lastDigit = n % 10
      if (lastDigit === 1) return 'стол'
      if (lastDigit >= 2 && lastDigit <= 4) return 'стола'
      return 'столов'
  }

  const getGameStatusLabel = (status) => {
      const labels = {
	  'not_started': 'Не начата',
	  'in_progress': 'В процессе', 
	  'finished': 'Завершена'
      }
      return labels[status] || 'Неизвестно'
  }

  const getGameStatusType = (status) => {
    if (!status) return 'info'
    const types = {
      'not_started': 'info',
      'in_progress': 'primary',
      'finished': 'success'
    }
    return types[status] || 'info'
  }

  const getResultLabel = (result) => {
    const labels = {
      'city_win': 'Победа города',
      'mafia_win': 'Победа мафии',
      'draw': 'Ничья'
    }
    return labels[result] || result
  }

  const getResultType = (result) => {
    if (!result) return 'info'
    const types = {
      'city_win': 'success',
      'mafia_win': 'danger',
      'draw': 'warning'
    }
    return types[result] || 'info'
  }


  const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('ru-RU', {
	  day: '2-digit',
	  month: 'long',
	  year: 'numeric'
      })
  }

  const formatDateTime = (dateString) => {
      if (!dateString) return 'Не указано'
      const date = new Date(dateString)
      return date.toLocaleDateString('ru-RU', {
	  day: '2-digit',
	  month: '2-digit',
	  year: 'numeric'
      }) + ' ' + date.toLocaleTimeString('ru-RU', {
	  hour: '2-digit',
	  minute: '2-digit'
      })
  }

  onMounted(() => {
      loadEvent()
  })
</script>

<style scoped>
  .event-view {
      min-height: 100vh;
      background-color: #f5f7fa;
  }

  .event-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 100%;
  }


  .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-weight: 600;
  }

  .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
  }


  .event-info .info-item {
      margin-bottom: 16px;
  }

  .event-info .info-item:last-child {
      margin-bottom: 0;
  }

  .event-info h6 {
      margin: 0 0 4px 0;
      font-weight: 600;
      color: #909399;
  }

  .event-info p {
      margin: 0;
      color: #303133;
  }

  .no-tables, .no-selection, .no-games {
      padding: 32px 0;
      text-align: center;
  }

  .table-item {
      cursor: pointer;
      transition: all 0.3s ease;
      border-radius: 6px;
      margin-bottom: 8px;
  }

  .table-item:hover {
      background-color: #f0f9ff;
  }

  .table-item.active {
      background-color: #ecf5ff;
      border-color: #409eff;
  }

  .table-item.virtual {
      border: 1px dashed #e6a23c;
      background-color: #fdf6ec;
  }

  .table-item.virtual:hover {
      background-color: #faecd8;
  }

  .table-item.virtual.active {
      background-color: #f5dab1;
      border-color: #e6a23c;
  }

  .table-content {
      width: 100%;
      padding: 8px;
  }

  .table-name {
      font-weight: 600;
      margin-bottom: 8px;
  }

  .table-masters {
      margin-top: 8px;
  }

  .master-name {
      font-size: 12px;
      color: #606266;
      margin-top: 2px;
  }

  .text-muted {
      color: #909399;
      font-size: 11px;
  }

  .table-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
  }

  .judge-info {
      font-size: 12px;
      color: #909399;
  }

  .section-title {
      margin: 0 0 16px 0;
      font-weight: 600;
      border-bottom: 1px solid #ebeef5;
      padding-bottom: 8px;
  }

  .games-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
  }

  .game-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border: 1px solid #ebeef5;
      border-radius: 6px;
      background-color: #fff;
      transition: all 0.3s ease;
  }

  .game-item:hover {
      border-color: #409eff;
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
  }

  .game-main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
  }

  .game-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
  }

  .game-name {
      margin: 0;
      font-weight: 600;
      font-size: 16px;
      color: #303133;
  }

  .game-datetime {
      font-size: 14px;
      color: #909399;
      font-weight: 500;
  }

  .game-details-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
  }

  .game-meta {
      display: flex;
      gap: 16px;
  }

  .game-master {
      font-size: 12px;
      color: #606266;
  }

  .game-status {
      display: flex;
      align-items: center;
  }

  .game-actions {
      display: flex;
      gap: 8px;
      align-items: center;
  }

  .mb-2 {
      margin-bottom: 8px;
  }

  .mb-4 {
      margin-bottom: 16px;
  }

  .ml-2 {
      margin-left: 8px;
  }
</style>
