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
          <h1>{{ event?.name || 'Загрузка мероприятия...' }}</h1>
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
                <div class="info-item">
                  <el-tag 
                    :type="getStatusTagType(event.status)"
                    class="mb-2"
                    >
                    {{ getStatusLabel(event.status) }}
                  </el-tag>
                  <el-tag type="info" class="ml-2">
                    {{ getCategoryLabel(event.category) }}
                  </el-tag>
                </div>

                <div class="info-item">
                  <h6>Описание:</h6>
                  <p>{{ event.description || 'Описание отсутствует' }}</p>
                </div>

                <div class="info-item">
                  <h6>Дата проведения:</h6>
                  <p>{{ formatDate(event.date) }}</p>
                </div>

                <div class="info-item">
                  <h6>Язык:</h6>
                  <p>{{ getLanguageLabel(event.language) }}</p>
                </div>

                <div class="info-item">
                  <h6>Столы:</h6>
                  <p>{{ event.tables.length }} {{ getTableNoun(event.tables.length) }}</p>
                </div>
              </div>

              <el-skeleton v-else :rows="5" animated />
            </el-card>

            <!-- Список столов -->
            <el-card>
              <template #header>
                <div class="card-header">
                  <el-icon><Grid /></el-icon>
                  <span>Игровые столы</span>
                  <el-button 
                    v-if="event && event.status !== 'completed'"
                    type="primary" 
                    size="small"
                    @click="showCreateTableDialog = true"
                    >
                    <el-icon><Plus /></el-icon>
                    Добавить
                  </el-button>
                </div>
              </template>

              <div v-if="event">
                <div v-if="event.tables.length === 0" class="no-tables">
                  <el-empty description="У этого мероприятия еще нет столов" />
                </div>

		<div class="tables-list">
		  <div
		    v-for="table in event.tables"
		    :key="table.id"
		    class="table-item"
		    :class="{ active: selectedTable?.id === table.id }"
		    @click="selectTable(table)"
		    >
		    <div class="table-content">
		      <div class="table-name">{{ table.name }}</div>
		      <div class="table-meta">
			<el-tag 
			  :type="table.seatingType === 'free' ? 'success' : 'primary'"
			  size="small"
			  >
			  {{ table.seatingType === 'free' ? 'Свободная рассадка' : 'Заданная рассадка' }}
			</el-tag>
			<span v-if="table.judge" class="judge-info">
			  Судья: {{ table.judge }}
			</span>
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
                  <el-icon><Grid /></el-icon>
                  <span>{{ selectedTable ? selectedTable.name : 'Выберите стол' }}</span>
                  <el-button 
                    v-if="selectedTable && event?.status !== 'completed'"
                    type="success" 
                    size="small"
                    @click="showCreateGameDialog = true"
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
                      <Grid />
                    </el-icon>
                  </template>
                </el-empty>
              </div>

              <div v-else class="table-details">
                <!-- Информация о столе -->
                <div class="table-info mb-4">
                  <el-descriptions :column="2" border>
                    <el-descriptions-item label="Название">
                      {{ selectedTable.name }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Тип рассадки">
                      <el-tag 
                        :type="selectedTable.seatingType === 'free' ? 'success' : 'primary'"
                        >
                        {{ selectedTable.seatingType === 'free' ? 'Свободная' : 'Заданная' }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item v-if="selectedTable.judge" label="Судья">
                      {{ selectedTable.judge }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Количество игр">
                      {{ selectedTable.games?.length || 0 }}
                    </el-descriptions-item>
                  </el-descriptions>
                </div>

                <!-- Игры стола -->
                <div class="games-section">
                  <h5 class="section-title">Игры</h5>

                  <div v-if="!selectedTable.games || selectedTable.games.length === 0" class="no-games">
                    <el-empty description="У этого стола еще нет игр" />
                  </div>

                  <div v-else class="games-grid">
                    <el-card 
                      v-for="game in selectedTable.games"
                      :key="game.id"
                      class="game-card"
                      shadow="hover"
                      >
                      <div class="game-header">
                        <h6 class="game-name">{{ game.name }}</h6>
                        <div class="game-actions">
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

                      <div class="game-info">
                        <div class="game-meta">
                          <span class="game-date">{{ formatDate(game.created) }}</span>
                          <el-tag :type="getGameStatusType(game.status)">
                            {{ getGameStatusLabel(game.status) }}
                          </el-tag>
                        </div>

                        <div v-if="game.status === 'in_progress'" class="game-progress">
                          <el-tag type="info">Круг: {{ game.currentRound }}</el-tag>
                        </div>

                        <div v-if="game.status === 'finished' && game.result" class="game-result">
                          <el-tag :type="getResultType(game.result)">
                            {{ getResultLabel(game.result) }}
                          </el-tag>
                        </div>
                      </div>

                      <div class="game-footer">
                        <el-button 
                          type="primary" 
                          @click="openGame(game.id)"
                          style="width: 100%"
                          >
                          Войти в игру
                        </el-button>
                      </div>
                    </el-card>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>

    <!-- Диалог создания стола -->
    <CreateTableDialog
      v-model="showCreateTableDialog"
      :event-id="parseInt($route.params.id)"
      @table-created="handleTableCreated"
      />

    <!-- Диалог создания игры -->
    <CreateGameDialog
      v-model="showCreateGameDialog"
      :event-id="parseInt($route.params.id)"
      :table-id="selectedTable?.id"
      @game-created="handleGameCreated"
      />
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useEventsStore } from '@/stores/events'
  import { apiService } from '@/services/api'
  import CreateTableDialog from '@/components/events/CreateTableDialog.vue'
  import CreateGameDialog from '@/components/events/CreateGameDialog.vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { 
      ArrowLeft, 
      InfoFilled, 
      Grid, 
      Plus, 
      Delete 
  } from '@element-plus/icons-vue'

  const route = useRoute()
  const router = useRouter()
  const eventsStore = useEventsStore()

  const event = ref(null)
  const selectedTable = ref(null)
  const showCreateTableDialog = ref(false)
  const showCreateGameDialog = ref(false)

  const selectTable = (table) => {
      selectedTable.value = table
  }

  const openGame = (gameId) => {
      const eventId = parseInt(route.params.id)
      const tableId = selectedTable.value.id
      router.push(`/game?eventId=${eventId}&tableId=${tableId}&gameId=${gameId}`)
  }

  const deleteGame = async (gameId) => {
      try {
	  await ElMessageBox.confirm(
	      'Вы уверены, что хотите удалить эту игру?',
	      'Подтверждение',
	      {
		  confirmButtonText: 'Да',
		  cancelButtonText: 'Отмена',
		  type: 'warning'
	      }
	  )

	  const eventId = parseInt(route.params.id)
	  const tableId = selectedTable.value.id
	  
	  await apiService.deleteGame(eventId, tableId, gameId)
	  
	  // Обновляем локальные данные
	  if (selectedTable.value && selectedTable.value.games) {
	      selectedTable.value.games = selectedTable.value.games.filter(g => g.id !== gameId)
	  }
	  
	  ElMessage.success('Игра удалена!')
	  
      } catch (error) {
	  if (error !== 'cancel') {
	      ElMessage.error('Ошибка при удалении игры')
	  }
      }
  }

  const handleTableCreated = () => {
      loadEvent()
      showCreateTableDialog.value = false
      ElMessage.success('Стол создан!')
  }

  const handleGameCreated = () => {
      loadEvent()
      showCreateGameDialog.value = false
      ElMessage.success('Игра создана!')
  }

  const loadEvent = async () => {
      try {
	  const eventId = parseInt(route.params.id)
	  event.value = await apiService.getEvent(eventId)
	  
	  // Выбираем первый стол по умолчанию
	  if (event.value.tables.length > 0) {
	      selectedTable.value = event.value.tables[0]
	  }
      } catch (error) {
	  ElMessage.error('Ошибка загрузки мероприятия')
	  router.push('/')
      }
  }

  // Вспомогательные функции
  const getStatusLabel = (status) => {
      const labels = {
	  'planned': 'В планах',
	  'active': 'Активно',
	  'completed': 'Завершено'
      }
      return labels[status] || 'Неизвестно'
  }

  const getStatusTagType = (status) => {
      if (!status) return 'info'
      const types = {
	  'planned': 'info',
	  'active': 'success',
	  'completed': 'info'
      }
      return types[status] || 'info'
  }

  const getCategoryLabel = (category) => {
      const labels = {
	  'funky': 'Фанки',
	  'minicap': 'Миникап',
	  'tournament': 'Турнир',
	  'charity_tournament': 'Благотворительный'
      }
      return labels[category] || 'Фанки'
  }

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

  .event-header h1 {
      margin: 0;
  }

  .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-weight: 600;
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

  .table-content {
      width: 100%;
      padding: 8px;
  }

  .table-name {
      font-weight: 600;
      margin-bottom: 8px;
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

  .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
  }

  .game-card {
      transition: all 0.3s ease;
  }

  .game-card:hover {
      transform: translateY(-2px);
  }

  .game-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
  }

  .game-name {
      margin: 0;
      font-weight: 600;
  }

  .game-info {
      margin-bottom: 16px;
  }

  .game-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
  }

  .game-date {
      font-size: 12px;
      color: #909399;
  }

  .game-progress, .game-result {
      text-align: center;
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
