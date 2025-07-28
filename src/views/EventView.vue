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
          <div class="header-actions">
            <el-button
              v-if="event"
              type="primary"
              @click="goToRegistration"
            >
              Регистрация на мероприятие
            </el-button>
          </div>
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
                      backgroundColor: getEventTypeColor(), 
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
          </el-col>

          <!-- Основной контент с вкладками -->
          <el-col :md="16">
            <el-card>
              <el-tabs v-model="activeTab" type="border-card">
                <!-- Вкладка Столы -->
                <el-tab-pane label="Столы" name="tables">
                  <template #label>
                    <span style="display: flex; align-items: center; gap: 4px;">
                      <el-icon><Grid /></el-icon>
                      Столы
                    </span>
                  </template>

                  <!-- Список столов -->
                  <div class="tab-content">
                    <div class="tab-header">
                      <span class="tab-title">Игровые столы</span>
                      <div class="header-actions">
                        <el-button 
                          v-if="canGenerateSeating"
                          type="success" 
                          size="small"
                          @click="showSeatingDialog = true"
                          >
                          <el-icon><Grid /></el-icon>
                          Сгенерировать рассадку ({{ confirmedPlayersCount }} игроков)
                        </el-button>
                        <el-button 
                          type="primary" 
                          size="small"
                          @click="createNewTable"
                          >
                          <el-icon><Plus /></el-icon>
                          Добавить стол
                        </el-button>
                      </div>
                    </div>

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
                          <div v-if="table.game_masters && table.game_masters.length > 0" class="table-judge">
                            {{ table.game_masters.map(m => m.nickname).join(', ') }}
                          </div>
                        </div>
                      </div>
                    </div>

                    <el-skeleton v-else :rows="3" animated />

                    <!-- Детали выбранного стола -->
                    <el-divider v-if="selectedTable" />
                    
                    <div v-if="selectedTable" class="table-details">
                      <div class="tab-header">
                        <span class="tab-title">{{ selectedTable.table_name }}</span>
                        <el-button 
                          v-if="event?.status !== 'completed'"
                          type="success" 
                          size="small"
                          @click="createNewGame"
                          >
                          <el-icon><Plus /></el-icon>
                          Новая игра
                        </el-button>
                      </div>

                      <!-- Предупреждение для виртуальных столов -->
                      <el-alert
                        v-if="selectedTable.isVirtual"
                        title="Временный стол"
                        type="warning"
                        description="Этот стол будет сохранен только после создания первой игры на нем. До этого момента стол будет пропадать при обновлении страницы."
                        :closable="false"
                        class="mb-4"
                      />

                      <!-- Игры стола -->
                      <div class="games-section">
                        <h5 class="section-title">Игры ({{ games.length }})</h5>

                        <div v-if="games.length === 0" class="no-games">
                          <el-empty description="У этого стола еще нет игр" />
                        </div>

                        <div v-else class="games-list">
                          <div 
                            v-for="game in games"
                            :key="game.id"
                            class="game-item clickable"
                            @click="openGame(game.id)"
                            >
                            <div class="game-main-content">
                              <div class="game-header">
                                <h6 class="game-name">{{ game.label }}</h6>
                              </div>
                              
                              <div class="game-info">
                                <div class="game-datetime">
                                  <el-icon size="14"><Calendar /></el-icon>
                                  {{ formatDateTime(game.started_at) }}
                                </div>
                                <span v-if="game.game_master && !isGameMasterSameAsTable(game)" class="game-master">
                                  <el-icon size="14"><User /></el-icon>
                                  {{ game.game_master.nickname }}
                                </span>
                              </div>
                            </div>
                            
                            <div class="game-side-actions" @click.stop>
                              <el-tag v-if="game.result" :type="getResultType(game.result)" size="small">
                                {{ getResultLabel(game.result) }}
                              </el-tag>
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
                  </div>
                </el-tab-pane>

                <!-- Вкладка Финансы -->
                <el-tab-pane label="Финансы" name="finances">
                  <template #label>
                    <span style="display: flex; align-items: center; gap: 4px;">
                      <el-icon><Money /></el-icon>
                      Финансы
                    </span>
                  </template>

                  <EventFinances v-if="event" :event="event" />
                  <el-skeleton v-else :rows="5" animated />
                </el-tab-pane>

                <!-- Вкладка Игроки -->
                <el-tab-pane label="Игроки" name="players">
                  <template #label>
                    <span style="display: flex; align-items: center; gap: 4px;">
                      <el-icon><User /></el-icon>
                      Игроки
                    </span>
                  </template>

                  <EventPlayers v-if="event" :event="event" />
                  <el-skeleton v-else :rows="5" animated />
                </el-tab-pane>

                <!-- Вкладка Результаты -->
                <el-tab-pane label="Результаты" name="results">
                  <template #label>
                    <span style="display: flex; align-items: center; gap: 4px;">
                      <el-icon><Trophy /></el-icon>
                      Результаты
                    </span>
                  </template>

                  <EventResults v-if="event" :event="event" />
                  <el-skeleton v-else :rows="5" animated />
                </el-tab-pane>

              </el-tabs>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>

    <!-- Диалог генерации рассадки -->
    <GenerateSeatingDialog
      v-model="showSeatingDialog"
      :confirmed-players="registrationsStore.confirmedRegistrations"
      :event-id="event?.id"
      @generated="handleSeatingGenerated"
    />

  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useEventsStore } from '@/stores/events'
  import { useRegistrationsStore } from '@/stores/registrations'
  import { apiService } from '@/services/api'
  import { ElMessage } from 'element-plus'
  import EventFinances from '@/components/events/EventFinances.vue'
  import EventPlayers from '@/components/events/EventPlayers.vue'
  import EventResults from '@/components/events/EventResults.vue'
  import GenerateSeatingDialog from '@/components/events/GenerateSeatingDialog.vue'
  import { 
      ArrowLeft, 
      InfoFilled,
      Plus,
      Delete,
      Grid,
      Calendar,
      User,
      Money,
      Trophy
  } from '@element-plus/icons-vue'

  const route = useRoute()
  const router = useRouter()
  const eventsStore = useEventsStore()
  const registrationsStore = useRegistrationsStore()

  const event = ref(null)
  const selectedTable = ref(null)
  const games = ref([])
  const virtualTables = ref([])
  const activeTab = ref('tables')
  const showSeatingDialog = ref(false)

  const tables = computed(() => {
    const realTables = event.value?.tables || []
    return [...realTables, ...virtualTables.value]
  })

  const tableCount = computed(() => {
    return tables.value.length
  })

  const confirmedPlayersCount = computed(() => {
    return registrationsStore.confirmedRegistrations.length
  })

  const canGenerateSeating = computed(() => {
    return confirmedPlayersCount.value >= 10
  })

  const selectTable = (table) => {
    selectedTable.value = table
    games.value = table.games || []
  }


  const openGame = (gameId) => {
    router.push(`/game/${gameId}`)
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
      
      // Перезагружаем данные события с сервера для получения актуальной информации
      await loadEvent()
      
      // Очищаем виртуальные столы, так как они могли стать реальными
      virtualTables.value = virtualTables.value.filter(virtualTable => {
        // Удаляем виртуальный стол, если появился реальный стол с таким же именем
        return !event.value?.tables?.some(realTable => realTable.table_name === virtualTable.table_name)
      })
      
      // Находим обновленный стол и обновляем игры
      // Сохраняем имя выбранного стола для поиска после обновления
      const selectedTableName = selectedTable.value.table_name
      const updatedTable = tables.value.find(table => table.table_name === selectedTableName)
      if (updatedTable) {
        selectTable(updatedTable)
      }
      
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
	  console.log('Event type:', event.value?.event_type)
	  console.log('Event type color:', event.value?.event_type?.color)
	  
	  // Загружаем регистрации для подсчета игроков
	  try {
	    await registrationsStore.fetchEventRegistrations(eventId)
	  } catch (error) {
	    console.warn('Failed to load registrations:', error)
	  }
	  
	  // Автоматически выбираем первый стол только если ни один стол не выбран
	  if (tables.value.length > 0 && !selectedTable.value) {
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
      'draw': 'Ничья',
      'created': 'Создана',
      'seating_ready': 'Рассадка готова',
      'role_distribution': 'Роздача ролей',
      'in_progress': 'В процессе',
      'finished_no_scores': 'Завершена без баллов',
      'finished_with_scores': 'Завершена с баллами',
      'cancelled': 'Отменена'
    }
    return labels[result] || result
  }

  const getResultType = (result) => {
    if (!result) return 'info'
    const types = {
      'city_win': 'success',
      'mafia_win': 'danger',
      'draw': 'warning',
      'created': 'info',
      'seating_ready': 'warning',
      'role_distribution': 'warning',
      'in_progress': 'primary',
      'finished_no_scores': 'success',
      'finished_with_scores': 'success',
      'cancelled': 'info'
    }
    return types[result] || 'info'
  }

  const isGameMasterSameAsTable = (game) => {
    // Проверяем, есть ли судья игры и судьи стола
    if (!game.game_master || !selectedTable.value?.game_masters || selectedTable.value.game_masters.length === 0) {
      return false
    }
    
    // Проверяем, является ли судья игры одним из судей стола
    return selectedTable.value.game_masters.some(
      tableMaster => tableMaster.id === game.game_master.id
    )
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

  const getEventTypeColor = () => {
      if (!event.value?.event_type?.color) {
          return '#409eff' // Синий по умолчанию
      }
      
      let color = event.value.event_type.color
      console.log('Original color from API:', color)
      
      // Если цвет не начинается с #, добавляем его
      if (!color.startsWith('#')) {
          color = '#' + color
      }
      
      console.log('Final color to apply:', color)
      return color
  }

  const goToRegistration = () => {
      router.push(`/event/${route.params.id}/register`)
  }

  const handleSeatingGenerated = async (result) => {
      console.log('Seating generated:', result)
      
      try {
          const { games, distribution } = result
          const eventId = route.params.id
          
          // Убедимся, что у нас достаточно столов
          const requiredTables = Math.ceil(registrationsStore.confirmedRegistrations.length / 10)
          const currentTables = tables.value.filter(t => !t.isVirtual).length
          
          // Создаем недостающие столы
          const neededTables = requiredTables - currentTables
          for (let i = 0; i < neededTables; i++) {
              const tableNumber = currentTables + i + 1
              const template = event.value?.table_name_template || 'Стол {}'
              const tableName = template.replace('{}', tableNumber)
              
              const newTable = {
                  table_name: tableName,
                  game_masters: [],
                  games: [],
                  isVirtual: true
              }
              
              virtualTables.value.push(newTable)
          }
          
          // Создаем игры с рассадкой
          let createdGames = 0
          let currentTableIndex = 0
          const tablesForDistribution = [...tables.value]
          
          for (let gameIndex = 0; gameIndex < games.length; gameIndex++) {
              const gamePlayers = games[gameIndex]
              
              // Определяем на какой стол поместить игру
              const tableIndex = Math.floor(gameIndex / Math.ceil(games.length / requiredTables))
              const currentTable = tablesForDistribution[tableIndex]
              
              if (!currentTable) {
                  console.error('Не найден стол для игры', gameIndex)
                  continue
              }
              
              const gameNumber = (currentTable.games?.length || 0) + 1
              const gameData = {
                  label: `Игра #${gameNumber}`,
                  event_id: eventId,
                  table_id: tableIndex + 1
              }
              
              try {
                  await apiService.createGameWithPlayers(gameData, gamePlayers)
                  createdGames++
              } catch (error) {
                  console.error('Ошибка создания игры:', error)
                  ElMessage.error(`Ошибка создания игры ${gameNumber}`)
              }
          }
          
          ElMessage.success(`Создано ${createdGames} игр с автоматической рассадкой`)
          
          // Перезагрузить данные события
          await loadEvent()
          
      } catch (error) {
          console.error('Ошибка генерации рассадки:', error)
          ElMessage.error('Ошибка при создании игр с рассадкой')
      }
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

  .header-actions {
      display: flex;
      gap: 10px;
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
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      padding: 12px 16px;
      transition: all 0.3s ease;
      border-radius: 6px;
      margin-bottom: 8px;
      border: 1px solid #ebeef5;
  }

  .table-item:hover {
      background-color: #f0f9ff;
      border-color: #409eff;
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

  .table-name {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
  }

  .table-judge {
      color: #606266;
      font-size: 14px;
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

  .game-item.clickable {
      cursor: pointer;
  }

  .game-item:hover {
      border-color: #409eff;
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
      transform: translateY(-1px);
  }

  .game-main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
  }

  .game-header {
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

  .game-info {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 13px;
      color: #606266;
  }

  .game-datetime {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #909399;
  }

  .game-master {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #606266;
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

  .game-side-actions {
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

  .tab-content {
      padding: 16px 0;
  }

  .tab-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #ebeef5;
  }

  .tab-title {
      font-weight: 600;
      font-size: 16px;
      color: #303133;
  }

  .tab-header .header-actions {
      display: flex;
      gap: 8px;
  }
</style>
