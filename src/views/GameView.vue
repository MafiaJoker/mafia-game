<template>
  <div class="game-view">
    <el-container>
      <!-- Заголовок игры -->
      <el-header>
        <div class="game-header-container">
          <div class="game-header">
            <div class="navigation-section">
              <el-button 
                @click="goToEvent"
                :icon="ArrowLeft"
              />
            </div>
            
            <div v-if="!isGameFinished" class="round-info">
              <div class="round-circle" :class="roundCircleClass">
                {{ gameStore.gameState.round }}
              </div>
            </div>
            
            <div v-if="!isGameFinished" class="timer-section">
              <GameTimer />
            </div>
            
            <div v-if="!isGameFinished" class="game-actions">
              <GameControls />
            </div>
          </div>
        </div>
      </el-header>

      <el-main>
        <div class="game-content">
          <!-- Информация о завершенной игре -->
          <el-card v-if="isGameFinished" class="game-result-card mb-4">
            <div class="game-result-content">
              <div class="game-title">
                <h3>{{ gameTitle }}</h3>
              </div>
              <div class="game-result">
                <el-tag 
                  :type="getResultType(gameResultDisplay)" 
                  :class="{ 'city-win-tag': gameResultDisplay === 'civilians_win' }"
                  size="large"
                >
                  {{ getResultLabel(gameResultDisplay) }}
                </el-tag>
                <div v-if="ppkInfo" class="ppk-info">
                  <el-tag type="warning" size="small">
                    ППК: {{ ppkInfo }}
                  </el-tag>
                </div>
              </div>
              
              <div class="game-actions">
                <el-button 
                  type="primary" 
                  @click="goToResults"
                  :icon="Trophy"
                >
                  Расставить баллы
                </el-button>
              </div>
            </div>
          </el-card>

          <!-- Контент для завершенных игр -->
          <template v-if="isGameFinished">
            <!-- Таблица игроков (только для просмотра) -->
            <PlayersTable :readonly="true" />
          </template>

          <!-- Игровой контент - показываем только для незавершенных игр -->
          <template v-if="!isGameFinished">
            <!-- Секция голосования -->
            <VotingSection v-if="showVotingSection" />

            <!-- Секция ночных действий -->
            <NightActionsSection v-if="showNightSection" />

            <!-- Секция лучшего хода -->
            <BestMoveSection v-if="showBestMoveSection" />

            <!-- Список игроков -->
            <PlayersTable />
          </template>
          
          <!-- Меню для игровых действий -->
          <div v-if="gameStore.isGameInProgress" class="game-menu-container">
            <el-dropdown trigger="click" placement="top">
              <el-button 
                type="default" 
                :icon="MoreFilled"
                circle
              />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item 
                    @click="showPpkDialog = true"
                    :disabled="!canUsePpk"
                  >
                    <el-icon><Warning /></el-icon>
                    ППК
                  </el-dropdown-item>
                  <el-dropdown-item 
                    @click="showCancelDialog = true"
                    divided
                  >
                    <el-icon><Close /></el-icon>
                    Отменить игру
                  </el-dropdown-item>
                  <el-dropdown-item 
                    @click="showEliminateDialog = true"
                  >
                    <el-icon><Delete /></el-icon>
                    Удалить игрока
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-main>
    </el-container>

    <!-- Модальные окна -->
    <PlayerEliminationDialog v-model="showEliminateDialog" />
    <GameCancellationDialog v-model="showCancelDialog" />
    <ScoreManagerDialog />
    <PpkControls v-model="showPpkDialog" />
  </div>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useGameStore } from '@/stores/game'
  import { useGamePhasesStore } from '@/stores/gamePhases'
  import { GAME_STATUSES, GAME_SUBSTATUS } from '@/utils/constants'
  import { ArrowLeft, MoreFilled, Warning, Close, Delete, Trophy } from '@element-plus/icons-vue'
  import GameTimer from '@/components/game/GameTimer.vue'
  import GameControls from '@/components/game/GameControls.vue'
  import GameStatusCard from '@/components/game/GameStatusCard.vue'
  import VotingSection from '@/components/game/VotingSection.vue'
  import NightActionsSection from '@/components/game/NightActionsSection.vue'
  import BestMoveSection from '@/components/game/BestMoveSection.vue'
  import PlayersTable from '@/components/game/PlayersTable.vue'
  import PlayerEliminationDialog from '@/components/game/dialogs/PlayerEliminationDialog.vue'
  import GameCancellationDialog from '@/components/game/dialogs/GameCancellationDialog.vue'
  import ScoreManagerDialog from '@/components/game/dialogs/ScoreManagerDialog.vue'
  import PpkControls from '@/components/game/PpkControls.vue'
  import { ElMessage } from 'element-plus'

  const props = defineProps({
      id: String
  })

  const route = useRoute()
  const router = useRouter()
  const gameStore = useGameStore()
  const gamePhasesStore = useGamePhasesStore()
  
  const showPpkDialog = ref(false)
  const showCancelDialog = ref(false)
  const showEliminateDialog = ref(false)
  
  const goToEvent = () => {
    const eventId = gameStore.gameInfo?.eventId
    console.log('Переходим к мероприятию:', eventId)
    
    if (eventId) {
      router.push(`/event/${eventId}`)
    } else {
      console.warn('EventId не найден, перенаправляем на главную')
      router.push('/')
    }
  }

  const goToResults = () => {
    const gameId = route.params.gameId || route.params.id
    router.push(`/game/${gameId}/results`)
  }

  const showVotingSection = computed(() => {
      return gameStore.gameState.gameStatus === GAME_STATUSES.IN_PROGRESS &&
          gameStore.gameState.gameSubstatus === GAME_SUBSTATUS.VOTING
  })

  const showNightSection = computed(() => {
      return gameStore.gameState.gameStatus === GAME_STATUSES.IN_PROGRESS &&
          gameStore.gameState.gameSubstatus === GAME_SUBSTATUS.NIGHT
  })

  const showBestMoveSection = computed(() => {
      return gameStore.gameState.gameStatus === GAME_STATUSES.IN_PROGRESS &&
          gameStore.gameState.showBestMove
  })
  
  const canUsePpk = computed(() => {
      return gameStore.isGameInProgress && 
          gameStore.gameState.round > 0
  })

  // Класс для круга в зависимости от статуса игры
  const isGameFinished = computed(() => {
    const finished = gameStore.gameState.gameStatus === 'finished_no_scores' || 
                     gameStore.gameState.gameStatus === 'finished_with_scores' ||
                     gameStore.gameState.gameStatus === 'civilians_win' ||
                     gameStore.gameState.gameStatus === 'mafia_win'
    console.log('isGameFinished computed:', finished, 'status:', gameStore.gameState.gameStatus)
    return finished
  })

  // Получаем результат игры для отображения
  const gameResultDisplay = computed(() => {
    // Если есть gameResult, используем его
    if (gameStore.gameState.gameResult) {
      return gameStore.gameState.gameResult
    }
    // Иначе проверяем gameStatus на результаты игры
    if (gameStore.gameState.gameStatus === 'civilians_win' || gameStore.gameState.gameStatus === 'mafia_win') {
      return gameStore.gameState.gameStatus
    }
    return null
  })
  
  const gameTitle = computed(() => {
    const gameData = gameStore.gameInfo?.gameData
    if (!gameData) return 'Игра'
    
    const eventName = gameData.event?.label || 'Мероприятие'
    const tableName = gameData.table_name || 'Стол'
    const gameLabel = gameData.label || 'Игра'
    
    return `${eventName} / ${tableName} / ${gameLabel}`
  })
  
  const getResultLabel = (result) => {
    const labels = {
      'civilians_win': 'Победа города',
      'mafia_win': 'Победа мафии'
    }
    return labels[result] || result
  }
  
  const getResultType = (result) => {
    const types = {
      'civilians_win': 'danger',
      'mafia_win': ''
    }
    return types[result] || 'info'
  }
  
  const ppkInfo = computed(() => {
    const gameData = gameStore.gameInfo?.gameData
    if (!gameData?.players) return null
    
    // Получаем ppk_box_id из текущей фазы
    const currentPhase = gamePhasesStore.currentPhase
    if (!currentPhase?.ppk_box_id) return null
    
    // Находим игрока по box_id
    const ppkPlayer = gameData.players.find(player => player.box_id === currentPhase.ppk_box_id)
    if (!ppkPlayer) return null
    
    return `${ppkPlayer.box_id}: ${ppkPlayer.nickname}`
  })
  
  const roundCircleClass = computed(() => {
    const status = gameStore.gameState.gameStatus
    const substatus = gameStore.gameState.gameSubstatus
    
    if (status === GAME_STATUSES.IN_PROGRESS) {
      switch (substatus) {
        case GAME_SUBSTATUS.DISCUSSION:
        case GAME_SUBSTATUS.CRITICAL_DISCUSSION:
          return 'discussion' // Синий - обсуждение
        case GAME_SUBSTATUS.VOTING:
          return 'voting' // Оранжевый - голосование
        case GAME_SUBSTATUS.NIGHT:
          return 'night' // Фиолетовый - ночь
        default:
          return 'in-progress' // Зеленый - в процессе
      }
    } else if (status === GAME_STATUSES.ROLE_DISTRIBUTION) {
      return 'role-distribution' // Желтый - распределение ролей
    } else if (status === GAME_STATUSES.NEGOTIATION) {
      return 'negotiation' // Серый - договорка
    } else {
      return 'default' // По умолчанию
    }
  })

  onMounted(async () => {
      try {
	  const gameId = props.id
	  
	  if (!gameId) {
	    ElMessage.error('Не указан ID игры')
	    router.push('/')
	    return
	  }
	  
	  await gameStore.initGame(null, null, gameId)
	  
      } catch (error) {
	  console.error('Ошибка инициализации игры:', error)
	  ElMessage.error('Не удалось загрузить игру')
	  // Перенаправляем на главную страницу, так как eventId теперь неизвестен
	  router.push('/')
      }
  })

  onUnmounted(() => {
      // Убрано автосохранение состояния
  })
</script>

<style scoped>
  .game-view {
      min-height: 100vh;
      background-color: #f5f7fa;
  }

  :deep(.el-main) {
      padding-top: 8px !important;
      display: flex;
      justify-content: center;
  }

  .game-content {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 16px;
  }

  @media (max-width: 768px) {
      .game-content {
          padding: 0 8px;
      }
  }

  .game-header-container {
      display: flex;
      justify-content: center;
      height: 100%;
      padding: 0 16px;
  }

  .game-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 100%;
      width: 100%;
      max-width: 1000px;
  }

  .navigation-section {
      display: flex;
      align-items: center;
  }

  .round-info {
      display: flex;
      align-items: center;
      justify-content: center;
  }

  .round-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid #409eff;
      background-color: transparent;
      color: #409eff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
      transition: all 0.3s ease;
  }

  /* Цвета круга в зависимости от статуса игры */
  .round-circle.discussion {
      border-color: #409eff;
      color: #409eff;
  }

  .round-circle.voting {
      border-color: #e6a23c;
      color: #e6a23c;
  }

  .round-circle.night {
      border-color: #722ed1;
      color: #722ed1;
  }

  .round-circle.in-progress {
      border-color: #67c23a;
      color: #67c23a;
  }

  .round-circle.role-distribution {
      border-color: #f56c6c;
      color: #f56c6c;
  }

  .round-circle.negotiation {
      border-color: #909399;
      color: #909399;
  }

  .timer-section {
      display: flex;
      align-items: center;
      gap: 12px;
  }

  .game-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
  }

  .game-menu-container {
      display: flex;
      justify-content: center;
      margin-top: 16px;
  }
  
  .game-result-card {
      text-align: center;
      border: 2px solid #409eff;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  }
  
  .game-result-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
  }
  
  .game-result {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
  }
  
  .ppk-info {
      margin-top: 8px;
  }
  
  .game-title h3 {
      margin: 0;
      color: #303133;
      font-size: 24px;
  }
  
  .mb-4 {
      margin-bottom: 16px;
  }
  
  .game-result :deep(.el-tag) {
      color: white;
  }
  
  /* Белый фон для победы города */
  .game-result :deep(.city-win-tag) {
      background-color: white !important;
      border-color: #409eff !important;
      color: #409eff !important;
  }
  
  .game-result :deep(.el-tag:not(.el-tag--danger)) {
      background-color: #606266;
      border-color: #606266;
  }

  @media (max-width: 768px) {
      .game-header {
	  flex-direction: column;
	  gap: 12px;
	  padding: 12px 16px;
      }
      
      .navigation-section {
	  align-self: flex-start;
      }
      
      .game-actions {
	  width: 100%;
	  justify-content: center;
      }
  }
</style>
