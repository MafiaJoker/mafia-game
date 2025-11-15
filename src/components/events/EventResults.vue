<template>
  <div class="event-results">
    <!-- Таблица статистики игроков -->
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><User /></el-icon>
            <span>Статистика игроков</span>
          </div>
        </div>
      </template>

      <el-table 
        :data="playerStatistics" 
        :loading="loading"
        style="width: 100%"
        stripe
      >
        <el-table-column 
          prop="name" 
          label="Игрок" 
          min-width="150"
          sortable
        >
          <template #default="{ row }">
            <span :class="{ 'mvp-player': isMvpPlayer(row) }">
              <el-icon v-if="isMvpPlayer(row)" class="mvp-crown"><Trophy /></el-icon>
              {{ row.name }}
            </span>
          </template>
        </el-table-column>
        <el-table-column 
          prop="totalScore" 
          label="Суммарный балл" 
          width="140"
          sortable
          align="center"
        >
          <template #default="{ row }">
            <span :class="{ 'positive-score': row.totalScore > 0, 'negative-score': row.totalScore < 0 }">
              {{ formatScore(row.totalScore) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column 
          prop="totalExtraPoints" 
          label="Суммарные доп. баллы" 
          width="160"
          sortable
          align="center"
        >
          <template #default="{ row }">
            <span :class="{ 'positive-score': row.totalExtraPoints > 0 }">
              {{ formatScore(row.totalExtraPoints) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column 
          prop="totalPenalties" 
          label="Суммарные пенальти" 
          width="150"
          sortable
          align="center"
        >
          <template #default="{ row }">
            <span :class="{ 'negative-score': row.totalPenalties < 0 }">
              {{ formatScore(row.totalPenalties) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column 
          prop="winLossRatio" 
          label="Победы/Поражения" 
          width="140"
          align="center"
        >
          <template #default="{ row }">
            {{ row.winLossRatio }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Общая статистика -->
    <el-row :gutter="16" class="mb-4 mt-4">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ totalGames }}</div>
            <div class="stat-label">Всего игр</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ cityWins }}</div>
            <div class="stat-label">Побед города</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ mafiaWins }}</div>
            <div class="stat-label">Побед мафии</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ cityWinRate }}%</div>
            <div class="stat-label">% побед города</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Таблица результатов -->
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><Trophy /></el-icon>
            <span>Результаты игр</span>
          </div>
          <div class="header-actions">
            <el-select 
              v-model="selectedTable" 
              placeholder="Все столы" 
              clearable 
              size="small"
              style="width: 150px;"
              @change="filterByTable"
              >
              <el-option
                v-for="table in uniqueTables"
                :key="table"
                :label="table"
                :value="table"
              />
            </el-select>
            <el-select 
              v-model="selectedResult" 
              placeholder="Все результаты" 
              clearable 
              size="small"
              style="width: 150px;"
              @change="filterByResult"
              >
              <el-option label="Победа города" value="civilians_win" />
              <el-option label="Победа мафии" value="mafia_win" />
              <el-option label="Ничья" value="draw" />
              <el-option label="В процессе" value="in_progress" />
              <el-option label="Отменена" value="cancelled" />
            </el-select>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading">
        <el-skeleton :rows="8" animated />
      </div>

      <div v-else-if="filteredGames.length === 0" class="no-games">
        <el-empty description="Нет игр для отображения" />
      </div>

      <div v-else class="results-table">
        <el-table 
          :data="paginatedGames" 
          stripe 
          style="width: 100%"
          :default-sort="{ prop: 'gameNumber', order: 'ascending' }"
          >
          
          <el-table-column prop="gameNumber" label="№" width="60" align="center" sortable />
          
          <el-table-column prop="label" label="Название игры" min-width="150" sortable>
            <template #default="{ row }">
              <span 
                @click="openGame(row.id)"
                class="game-link"
                >
                {{ row.label }}
              </span>
            </template>
          </el-table-column>

          <el-table-column prop="tableName" label="Стол" width="120" sortable />

          <el-table-column label="Дата/Время" width="140" sortable>
            <template #default="{ row }">
              {{ formatDateTime(row.started_at) }}
            </template>
          </el-table-column>

          <el-table-column label="Продолжительность" width="120" align="center">
            <template #default="{ row }">
              <span v-if="row.duration" class="duration">
                {{ formatDuration(row.duration) }}
              </span>
              <span v-else class="no-duration">—</span>
            </template>
          </el-table-column>

          <el-table-column label="Результат" width="140" align="center" sortable>
            <template #default="{ row }">
              <el-tag 
                :type="getResultType(row.result)" 
                :class="{ 'mafia-win-tag': row.result === 'mafia_win' }"
                size="small"
              >
                {{ getResultLabel(row.result) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="Судья" width="120">
            <template #default="{ row }">
              <span v-if="row.game_master">
                {{ row.game_master.nickname }}
              </span>
              <span v-else class="no-judge">—</span>
            </template>
          </el-table-column>

          <el-table-column label="Игроки" min-width="200">
            <template #default="{ row }">
              <div class="players-preview">
                <el-tag 
                  v-for="player in getGamePlayers(row).slice(0, 3)" 
                  :key="player.id"
                  :type="getPlayerTagType(player)"
                  size="small"
                  class="player-tag"
                  >
                  {{ player.name }}
                </el-tag>
                <el-tag 
                  v-if="getGamePlayers(row).length > 3"
                  size="small"
                  type="info"
                  >
                  +{{ getGamePlayers(row).length - 3 }}
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="Лучший ход" width="120" align="center">
            <template #default="{ row }">
              <span v-if="row.best_move_player" class="best-move">
                {{ row.best_move_player }}
              </span>
              <span v-else class="no-best-move">—</span>
            </template>
          </el-table-column>

          <el-table-column label="Действия" width="80" align="center">
            <template #default="{ row }">
              <el-button 
                type="primary" 
                size="small" 
                circle
                @click="openGame(row.id)"
                title="Открыть игру"
                >
                <el-icon><View /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- Пагинация -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            :total="filteredGames.length"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { apiService } from '@/services/api'
  import { 
      Trophy,
      View,
      User
  } from '@element-plus/icons-vue'

  const props = defineProps({
      event: {
          type: Object,
          required: false,
          default: null
      }
  })

  const router = useRouter()
  const games = ref([])
  const ratingsData = ref(null)
  const loading = ref(false)
  const selectedTable = ref('')
  const selectedResult = ref('')
  const currentPage = ref(1)
  const pageSize = ref(20)

  const loadEventGames = async () => {
      if (!props.event?.tables) return

      loading.value = true
      try {
          // Загружаем рейтинги параллельно
          if (props.event?.id) {
              await loadEventRatings()
          }

          const allGames = []
          let gameCounter = 1

          // Собираем все игры из всех столов и загружаем детальную информацию
          for (const table of props.event.tables) {
              const tableGames = table.games || []
              
              for (const game of tableGames) {
                  try {
                      // Загружаем детальную информацию об игре включая игроков
                      const gameDetails = await apiService.getGame(game.id)
                      
                      allGames.push({
                          ...game,
                          ...gameDetails, // Добавляем детальную информацию
                          tableName: table.table_name,
                          gameNumber: gameCounter++,
                          duration: calculateGameDuration(game)
                      })
                  } catch (error) {
                      console.warn(`Ошибка загрузки игры ${game.id}:`, error)
                      // Добавляем игру без детальной информации
                      allGames.push({
                          ...game,
                          tableName: table.table_name,
                          gameNumber: gameCounter++,
                          duration: calculateGameDuration(game)
                      })
                  }
              }
          }

          // Сортируем игры по времени создания
          games.value = allGames.sort((a, b) => {
              const dateA = new Date(a.started_at || a.created_at)
              const dateB = new Date(b.started_at || b.created_at)
              return dateA - dateB
          })

          // Обновляем номера игр после сортировки
          games.value.forEach((game, index) => {
              game.gameNumber = index + 1
          })

      } catch (error) {
          console.error('Ошибка загрузки результатов игр:', error)
      } finally {
          loading.value = false
      }
  }

  const calculateGameDuration = (game) => {
      if (!game.started_at || !game.finished_at) return null
      
      const start = new Date(game.started_at)
      const end = new Date(game.finished_at)
      const durationMs = end - start
      
      return Math.floor(durationMs / 60000) // в минутах
  }

  // Вычисляемые свойства для статистики
  const totalGames = computed(() => games.value.length)
  
  const cityWins = computed(() => {
      return games.value.filter(game => game.result === 'civilians_win').length
  })

  const mafiaWins = computed(() => {
      return games.value.filter(game => game.result === 'mafia_win').length
  })

  const cityWinRate = computed(() => {
      const finishedGames = games.value.filter(game => 
          ['civilians_win', 'mafia_win'].includes(game.result)
      ).length
      
      return finishedGames > 0 ? Math.round((cityWins.value / finishedGames) * 100) : 0
  })

  const loadEventRatings = async () => {
      if (!props.event?.id) return

      console.log('Loading ratings for event:', props.event.id)
      try {
          const data = await apiService.getEventRatings(props.event.id)
          console.log('Ratings loaded:', data)
          ratingsData.value = data
      } catch (error) {
          console.error('Ошибка загрузки рейтингов:', error)
          ratingsData.value = null
      }
  }

  // Статистика игроков на основе данных рейтингов
  const playerStatistics = computed(() => {
      if (!ratingsData.value || !ratingsData.value.stages) return []

      const playersMap = new Map()

      // Сначала собираем данные из рейтингов
      ratingsData.value.stages.forEach(stage => {
          stage.stage_scoreboard.forEach(playerData => {
              if (!playersMap.has(playerData.user.id)) {
                  playersMap.set(playerData.user.id, {
                      id: playerData.user.id,
                      name: playerData.user.nickname,
                      totalScore: playerData.all_points_summary || 0,
                      totalExtraPoints: playerData.extra_points_summary || 0,
                      totalPenalties: playerData.penalty_points_summary || 0,
                      totalBestMove: playerData.best_move_points_summary || 0,
                      position: playerData.position || 0,
                      wins: 0,
                      losses: 0
                  })
              }
          })
      })

      // Теперь подсчитываем победы/поражения из игр
      games.value.forEach(game => {
          if (game.players && Array.isArray(game.players) && game.result) {
              game.players.forEach(player => {
                  const playerId = player.user_id || player.id
                  
                  // Ищем игрока в нашей карте по ID или по имени
                  let playerStats = playersMap.get(playerId)
                  if (!playerStats && player.name) {
                      // Попробуем найти по имени если не нашли по ID
                      for (const [id, stats] of playersMap.entries()) {
                          if (stats.name === player.name || stats.name === player.nickname) {
                              playerStats = stats
                              break
                          }
                      }
                  }
                  
                  if (playerStats && game.result && (game.result === 'civilians_win' || game.result === 'mafia_win')) {
                      // Определяем роль игрока
                      const playerRole = player.original_role || player.role
                      const isCivilian = ['Мирный', 'Шериф', 'civilian', 'sheriff'].includes(playerRole)
                      const isMafia = ['Мафия', 'Дон', 'mafia', 'don'].includes(playerRole)

                      // Считаем победы/поражения
                      if ((game.result === 'civilians_win' && isCivilian) || (game.result === 'mafia_win' && isMafia)) {
                          playerStats.wins++
                      } else {
                          playerStats.losses++
                      }
                  }
              })
          }
      })

      // Преобразуем в массив и добавляем дробь победы/поражения
      const allPlayers = Array.from(playersMap.values()).map(player => ({
          ...player,
          winLossRatio: `${player.wins}/${player.losses}`
      }))

      // Сортируем по позиции (по возрастанию - 1, 2, 3...)
      return allPlayers.sort((a, b) => a.position - b.position)
  })

  // Уникальные столы для фильтра
  const uniqueTables = computed(() => {
      const tables = [...new Set(games.value.map(game => game.tableName))]
      return tables.sort()
  })

  // Фильтрация и пагинация
  const filteredGames = computed(() => {
      let filtered = games.value

      if (selectedTable.value) {
          filtered = filtered.filter(game => game.tableName === selectedTable.value)
      }

      if (selectedResult.value) {
          filtered = filtered.filter(game => game.result === selectedResult.value)
      }

      return filtered
  })

  const paginatedGames = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filteredGames.value.slice(start, end)
  })

  // Методы
  const openGame = (gameId) => {
      router.push(`/game/${gameId}`)
  }

  const getGamePlayers = (game) => {
      return game.players || []
  }

  const getPlayerTagType = (player) => {
      if (!player.role) return 'info'
      
      const roleTypes = {
          'Мирный': 'success',
          'Шериф': 'primary', 
          'Мафия': 'danger',
          'Дон': 'warning'
      }
      return roleTypes[player.role] || 'info'
  }

  const formatScore = (score) => {
      if (!score && score !== 0) return '0'
      // Округляем до 2 знаков после запятой и убираем лишние нули
      const rounded = Math.round(score * 100) / 100
      return rounded >= 0 ? `+${rounded}` : `${rounded}`
  }

  const isMvpPlayer = (player) => {
      return ratingsData.value?.mvp?.nickname === player.name
  }

  const getResultType = (result) => {
      const types = {
          'civilians_win': 'danger',
          'mafia_win': undefined,
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

  const getResultLabel = (result) => {
      const labels = {
          'civilians_win': 'Победа города',
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

  const formatDuration = (minutes) => {
      if (!minutes) return '—'
      
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      
      if (hours > 0) {
          return `${hours}ч ${mins}м`
      }
      return `${mins}м`
  }

  const filterByTable = () => {
      currentPage.value = 1
  }

  const filterByResult = () => {
      currentPage.value = 1
  }

  const handleSizeChange = (newSize) => {
      pageSize.value = newSize
      currentPage.value = 1
  }

  const handleCurrentChange = (newPage) => {
      currentPage.value = newPage
  }

  onMounted(() => {
      if (props.event?.id) {
          loadEventGames()
          loadEventRatings()
      }
  })

  // Следим за изменениями event
  watch(() => props.event, (newEvent) => {
      if (newEvent?.id) {
          loadEventGames()
          loadEventRatings()
      }
  })
</script>

<style scoped>
  .event-results {
      padding: 0;
  }

  .stat-card {
      text-align: center;
  }

  .stat-content {
      padding: 8px;
  }

  .stat-number {
      font-size: 28px;
      font-weight: bold;
      color: #409eff;
      margin-bottom: 4px;
  }

  .stat-label {
      font-size: 12px;
      color: #909399;
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

  .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
  }

  .loading {
      padding: 32px 0;
  }

  .no-games {
      padding: 32px 0;
      text-align: center;
  }

  .game-link {
      color: #409eff;
      cursor: pointer;
      font-weight: 500;
      text-decoration: none;
      transition: color 0.2s ease;
  }

  .game-link:hover {
      color: #66b1ff;
      text-decoration: underline;
  }

  .duration {
      color: #606266;
      font-size: 12px;
  }

  .no-duration,
  .no-judge,
  .no-best-move {
      color: #c0c4cc;
  }

  .players-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
  }

  .player-tag {
      margin: 2px 0;
  }

  .best-move {
      color: #67c23a;
      font-weight: 500;
      font-size: 12px;
  }

  .pagination-wrapper {
      margin-top: 16px;
      display: flex;
      justify-content: center;
  }

  .mb-4 {
      margin-bottom: 16px;
  }
  
  /* Серый фон для победы мафии */
  :deep(.el-tag:not(.el-tag--danger):not(.el-tag--warning):not(.el-tag--primary):not(.el-tag--success):not(.el-tag--info)) {
      background-color: #606266 !important;
      border-color: #606266 !important;
      color: white !important;
  }
  
  /* Прямой стиль для победы мафии */
  :deep(.mafia-win-tag) {
      background-color: #606266 !important;
      border-color: #606266 !important;
      color: white !important;
  }

  /* Стили для статистики игроков */
  .positive-score {
      color: #67c23a;
      font-weight: 600;
  }

  .negative-score {
      color: #f56c6c;
      font-weight: 600;
  }

  .mt-4 {
      margin-top: 16px;
  }

  /* Стили для MVP игрока */
  .mvp-player {
      color: #f39c12;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 4px;
  }

  .mvp-crown {
      color: #f39c12;
      font-size: 16px;
  }
  
</style>