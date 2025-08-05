<template>
  <div class="game-results-view">
    <el-container>
      <!-- Заголовок -->
      <el-header>
        <div class="results-header">
          <div class="navigation-section">
            <el-button 
              @click="goBack"
              :icon="ArrowLeft"
            >
              Назад
            </el-button>
          </div>
          
          <div class="game-info">
            <h2>{{ gameTitle }}</h2>
            <div class="game-meta">
              <el-tag v-if="gameResult" :type="gameResult === 'civilians_win' ? 'success' : 'danger'">
                {{ gameResult === 'civilians_win' ? 'Победа города' : 'Победа мафии' }}
              </el-tag>
              <span class="game-date">{{ formatDate(gameInfo?.created_at) }}</span>
            </div>
          </div>

          <div class="header-actions">
            <el-button 
              type="primary" 
              @click="saveAllScores"
              :loading="saving"
              :disabled="!hasChanges"
            >
              Сохранить все изменения
            </el-button>
          </div>
        </div>
      </el-header>

      <el-main>
        <el-row :gutter="20" class="results-content">
          <!-- Левая панель - баллы игроков -->
          <el-col :lg="16" :md="14" :sm="24">
            <el-card>
              <template #header>
                <div class="card-header">
                  <el-icon><Trophy /></el-icon>
                  <span>Расстановка баллов</span>
                </div>
              </template>

              <div class="players-scoring">
                <div 
                  v-for="player in sortedPlayers" 
                  :key="player.id"
                  class="player-scoring-row"
                  :class="{ 
                    'winner': isWinner(player)
                  }"
                >
                  <!-- Информация об игроке -->
                  <div class="player-info">
                    <div class="player-number">{{ player.id }}</div>
                    <div class="player-role">
                      <component 
                        :is="getRoleIconComponent(player.originalRole)" 
                        :color="getRoleColor(player.originalRole)"
                        :title="getRoleLabel(player.originalRole)"
                      />
                    </div>
                    <div class="player-details">
                      <div class="player-name">{{ getPlayerName(player) }}</div>
                    </div>
                  </div>

                  <!-- Баллы -->
                  <div class="scoring-section">
                    <!-- Автоматические баллы -->
                    <div class="score-group">
                      <div class="score-label">Авто</div>
                      <div class="score-value auto">
                        {{ getPlayerScore(player.id, 'auto') }}
                      </div>
                    </div>

                    <!-- Доп. баллы -->
                    <div class="score-group">
                      <div class="score-label">Доп. баллы</div>
                      <el-input-number
                        v-if="playerScores[player.id]"
                        v-model="playerScores[player.id].additional"
                        :min="-3"
                        :max="3"
                        :step="0.1"
                        :precision="1"
                        size="small"
                        :controls="false"
                        @change="onScoreChange(player.id)"
                      />
                    </div>

                    <!-- Штрафные баллы -->
                    <div class="score-group">
                      <div class="score-label">Штраф</div>
                      <el-input-number
                        v-if="playerScores[player.id]"
                        v-model="playerScores[player.id].manual"
                        :min="0"
                        :max="5"
                        :step="0.1"
                        :precision="1"
                        size="small"
                        :controls="false"
                        @change="onScoreChange(player.id)"
                      />
                    </div>

                    <!-- Итого -->
                    <div class="score-group total">
                      <div class="score-label">Итого</div>
                      <div class="score-value total">
                        {{ getTotalScore(player.id).toFixed(1) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>

          <!-- Правая панель - комментарии и дополнительная информация -->
          <el-col :lg="8" :md="10" :sm="24">
            <!-- Комментарий к игре -->
            <el-card class="mb-4">
              <template #header>
                <div class="card-header">
                  <el-icon><ChatDotRound /></el-icon>
                  <span>Комментарий к игре</span>
                </div>
              </template>

              <el-input
                v-model="gameComment"
                type="textarea"
                :rows="6"
                placeholder="Добавьте комментарий к игре: интересные моменты, заметки судьи, особенности игры..."
                @input="onCommentChange"
              />
            </el-card>

          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, reactive, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useGameStore } from '@/stores/game'
  import { apiService } from '@/services/api'
  import { PLAYER_ROLES } from '@/utils/constants'
  import { ElMessage } from 'element-plus'
  import { 
    ArrowLeft, 
    Trophy, 
    ChatDotRound
  } from '@element-plus/icons-vue'
  import CitizenIcon from '@/components/game/icons/CitizenIcon.vue'
  import SheriffIcon from '@/components/game/icons/SheriffIcon.vue'
  import MafiaIcon from '@/components/game/icons/MafiaIcon.vue'
  import DonIcon from '@/components/game/icons/DonIcon.vue'

  const route = useRoute()
  const router = useRouter()
  const gameStore = useGameStore()

  const saving = ref(false)
  const hasChanges = ref(false)
  const gameComment = ref('')
  const playerScores = reactive({})

  const sortedPlayers = computed(() => {
    return [...gameStore.gameState.players].sort((a, b) => a.id - b.id)
  })

  const gameInfo = computed(() => gameStore.gameInfo?.gameData)
  const gameResult = computed(() => gameStore.gameState.gameResult)
  const gameTitle = computed(() => {
    const gameData = gameStore.gameInfo?.gameData
    if (!gameData) return 'Результаты игры'
    
    const eventName = gameData.event?.label || 'Мероприятие'
    const tableName = gameData.table_name || 'Стол'
    const gameLabel = gameData.label || 'Игра'
    
    return `${eventName} / ${tableName} / ${gameLabel}`
  })

  const initializePlayerScores = () => {
    if (!gameStore.gameState.players || gameStore.gameState.players.length === 0) {
      console.warn('Players not loaded yet, skipping score initialization')
      return
    }
    
    console.log('Инициализируем баллы игроков. API данные:', gameStore.gameInfo?.gameData?.players)
    
    gameStore.gameState.players.forEach(player => {
      if (!playerScores[player.id]) {
        const autoScore = getPlayerScore(player.id, 'auto')
        const penaltyScore = getPlayerScore(player.id, 'manual')
        const extraScore = getPlayerScore(player.id, 'additional')
        
        console.log(`Игрок ${player.id}: авто=${autoScore}, штраф=${penaltyScore}, доп=${extraScore}`)
        
        playerScores[player.id] = {
          auto: autoScore,
          manual: penaltyScore || 0,
          additional: extraScore || 0
        }
      }
    })
  }

  const getPlayerScore = (playerId, scoreType) => {
    const gameData = gameStore.gameInfo?.gameData
    if (!gameData?.players) return 0
    
    const apiPlayer = gameData.players.find(p => p.box_id === playerId)
    if (!apiPlayer) return 0
    
    // Маппинг полей в соответствии с API
    let value = 0
    switch (scoreType) {
      case 'auto':
        value = apiPlayer.auto_points
        break
      case 'manual':
        value = apiPlayer.penalty_points
        break
      case 'additional':
        value = apiPlayer.extra_points
        break
      default:
        value = 0
    }
    
    return value !== null && value !== undefined ? value : 0
  }

  const getTotalScore = (playerId) => {
    const scores = playerScores[playerId]
    const total = (scores?.auto || 0) - (scores?.manual || 0) + (scores?.additional || 0)
    return Math.round(total * 10) / 10  // Округляем до 1 знака после запятой
  }

  const isWinner = (player) => {
    if (!gameResult.value) return false
    
    const isRedTeam = player.originalRole === 'civilian' || player.originalRole === 'sheriff'
    const isBlackTeam = player.originalRole === 'mafia' || player.originalRole === 'don'
    
    return (gameResult.value === 'civilians_win' && isRedTeam) || 
           (gameResult.value === 'mafia_win' && isBlackTeam)
  }

  const getRoleLabel = (role) => {
    const labels = {
      'civilian': 'Мирный',
      'mafia': 'Мафия',
      'don': 'Дон',
      'sheriff': 'Шериф'
    }
    return labels[role] || role
  }

  const getRoleIconComponent = (role) => {
    // Конвертируем английские роли в русские если нужно
    const russianRole = convertToRussianRole(role)
    
    if (!russianRole) return CitizenIcon // Для null ролей показываем иконку мирного
    switch (russianRole) {
      case PLAYER_ROLES.CIVILIAN: return CitizenIcon
      case PLAYER_ROLES.SHERIFF: return SheriffIcon
      case PLAYER_ROLES.MAFIA: return MafiaIcon
      case PLAYER_ROLES.DON: return DonIcon
      default: return CitizenIcon
    }
  }

  const convertToRussianRole = (role) => {
    // Маппинг английских ролей в русские
    const mapping = {
      'civilian': PLAYER_ROLES.CIVILIAN,
      'sheriff': PLAYER_ROLES.SHERIFF,
      'mafia': PLAYER_ROLES.MAFIA,
      'don': PLAYER_ROLES.DON,
      // Если роль уже русская, возвращаем как есть
      [PLAYER_ROLES.CIVILIAN]: PLAYER_ROLES.CIVILIAN,
      [PLAYER_ROLES.SHERIFF]: PLAYER_ROLES.SHERIFF,
      [PLAYER_ROLES.MAFIA]: PLAYER_ROLES.MAFIA,
      [PLAYER_ROLES.DON]: PLAYER_ROLES.DON
    }
    return mapping[role] || null
  }

  const getRoleColor = (role) => {
    const russianRole = convertToRussianRole(role)
    
    if (!gameResult.value) {
      // Обычные цвета ролей
      if (!russianRole) return '#909399'
      switch (russianRole) {
        case PLAYER_ROLES.CIVILIAN: return '#909399' // серый
        case PLAYER_ROLES.SHERIFF: return '#f56c6c' // красный
        case PLAYER_ROLES.MAFIA: return '#000000' // черный
        case PLAYER_ROLES.DON: return '#000000' // черный
        default: return '#909399'
      }
    }
    
    // Цвета в зависимости от результата игры
    const isRedTeam = russianRole === PLAYER_ROLES.CIVILIAN || russianRole === PLAYER_ROLES.SHERIFF
    const isBlackTeam = russianRole === PLAYER_ROLES.MAFIA || russianRole === PLAYER_ROLES.DON
    
    if (gameResult.value === 'civilians_win') {
      return isRedTeam ? '#f56c6c' : '#c0c4cc' // победители красные, проигравшие серые
    } else if (gameResult.value === 'mafia_win') {
      return isBlackTeam ? '#000000' : '#c0c4cc' // победители черные, проигравшие серые
    }
    
    return '#909399'
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('ru-RU')
  }

  const getPlayerName = (player) => {
    // Сначала ищем игрока в API данных по box_id для получения nickname
    const gameData = gameStore.gameInfo?.gameData
    if (gameData?.players) {
      const apiPlayer = gameData.players.find(p => p.box_id === player.id)
      if (apiPlayer?.nickname) {
        return apiPlayer.nickname
      }
    }
    
    // Если не нашли в API данных, используем данные из gameState
    if (player.nickname) {
      return player.nickname
    }
    
    // В крайнем случае показываем "Игрок N"
    return `Игрок ${player.id}`
  }

  const onScoreChange = (playerId) => {
    hasChanges.value = true
  }

  const onCommentChange = () => {
    hasChanges.value = true
  }


  const saveAllScores = async () => {
    saving.value = true
    try {
      // Подготавливаем данные для API в правильном формате
      const updates = Object.entries(playerScores).map(([playerId, scores]) => ({
        box_id: parseInt(playerId),
        extra_points: scores.additional || 0,
        penalty_points: scores.manual || 0,
        comment: gameComment.value || ""
      }))
      
      console.log('Отправляем данные на API:', updates)
      
      // Сохраняем баллы через API
      await apiService.setPlayersPoints(route.params.id, updates)
      
      ElMessage.success('Все изменения сохранены!')
      hasChanges.value = false
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      ElMessage.error('Ошибка сохранения изменений')
    } finally {
      saving.value = false
    }
  }

  const goBack = () => {
    const gameId = route.params.id
    router.push(`/game/${gameId}`)
  }

  // Следим за изменениями в игроках и инициализируем баллы
  watch(() => gameStore.gameState.players, (newPlayers) => {
    if (newPlayers && newPlayers.length > 0) {
      initializePlayerScores()
    }
  }, { immediate: true })

  onMounted(async () => {
    const gameId = route.params.id
    if (gameId) {
      await gameStore.loadGameDetailed(gameId)
      initializePlayerScores()
      
      // Загружаем комментарий если есть
      gameComment.value = gameInfo.value?.comment || ''
    }
  })
</script>

<style scoped>
  .game-results-view {
    height: 100vh;
    background-color: #f5f7fa;
  }

  .results-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    background: white;
    border-bottom: 1px solid #e4e7ed;
    height: 100%;
  }

  .game-info h2 {
    margin: 0 0 8px 0;
    color: #303133;
    font-size: 20px;
  }

  .game-meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .game-date {
    color: #909399;
    font-size: 14px;
  }

  .results-content {
    padding: 20px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }

  .players-scoring {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .player-scoring-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    background: white;
    transition: all 0.3s ease;
  }

  .player-scoring-row.winner {
    border-color: #67c23a;
    background-color: #f0f9ff;
  }


  .player-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .player-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #409eff;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 12px;
  }

  .player-details {
    flex: 1;
  }

  .player-name {
    font-weight: 600;
    font-size: 15px;
    color: #303133;
  }

  .player-role {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    min-width: 24px;
  }

  .scoring-section {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .score-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 80px;
  }

  .score-group.total {
    min-width: 90px;
  }

  .score-label {
    font-size: 12px;
    color: #909399;
    font-weight: 500;
  }

  .score-value {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .score-value.auto {
    color: #909399;
  }

  .score-value.total {
    color: #409eff;
    font-size: 20px;
  }



  .ml-1 {
    margin-left: 4px;
  }

  .mb-4 {
    margin-bottom: 16px;
  }

  /* Убираем рамки у полей ввода баллов */
  .score-group :deep(.el-input-number) {
    width: 60px;
  }

  .score-group :deep(.el-input__wrapper) {
    border: none !important;
    box-shadow: none !important;
    background-color: #f5f7fa;
    border-radius: 4px;
    padding: 4px 8px;
  }

  .score-group :deep(.el-input__inner) {
    text-align: center;
    font-weight: 600;
    color: #303133;
  }

  @media (max-width: 768px) {
    .results-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
    }

    .results-content {
      padding: 12px;
    }

    .player-scoring-row {
      flex-direction: column;
      gap: 16px;
    }

    .scoring-section {
      width: 100%;
      justify-content: space-around;
    }

    .score-group {
      min-width: 60px;
    }
  }
</style>