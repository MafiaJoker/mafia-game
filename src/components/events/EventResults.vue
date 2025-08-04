<template>
  <div class="event-results">
    <!-- Общая статистика -->
    <el-row :gutter="16" class="mb-4">
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
  import { 
      Trophy,
      View
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
  const loading = ref(false)
  const selectedTable = ref('')
  const selectedResult = ref('')
  const currentPage = ref(1)
  const pageSize = ref(20)

  const loadEventGames = async () => {
      if (!props.event?.tables) return

      loading.value = true
      try {
          const allGames = []
          let gameCounter = 1

          // Собираем все игры из всех столов
          for (const table of props.event.tables) {
              const tableGames = table.games || []
              
              for (const game of tableGames) {
                  allGames.push({
                      ...game,
                      tableName: table.table_name,
                      gameNumber: gameCounter++,
                      duration: calculateGameDuration(game)
                  })
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
      }
  })

  // Следим за изменениями event
  watch(() => props.event, (newEvent) => {
      if (newEvent?.id) {
          loadEventGames()
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
  
</style>