<template>
  <div class="game-view">
    <el-container>
      <!-- Заголовок игры -->
      <el-header>
        <div class="game-header">
          <div class="navigation-section">
            <el-button 
              @click="goToEvent"
              :icon="ArrowLeft"
              size="small"
            />
          </div>
          
          <div class="round-info">
            <div class="round-circle" :class="roundCircleClass">
              {{ gameStore.gameState.round }}
            </div>
          </div>
          
          <div class="timer-section">
            <GameTimer />
          </div>
          
          <div class="game-actions">
            <GameControls />
          </div>
        </div>
      </el-header>

      <el-main>
        <!-- Статус игры убран для экономии места -->

        <!-- Секция голосования -->
        <VotingSection v-if="showVotingSection" />

        <!-- Секция ночных действий -->
        <NightActionsSection v-if="showNightSection" />

        <!-- Секция лучшего хода -->
        <BestMoveSection v-if="showBestMoveSection" />

        <!-- Список игроков -->
        <PlayersTable />
      </el-main>
    </el-container>

    <!-- Модальные окна -->
    <PlayerEliminationDialog />
    <GameCancellationDialog />
    <ScoreManagerDialog />
  </div>
</template>

<script setup>
  import { computed, onMounted, onUnmounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useGameStore } from '@/stores/game'
  import { GAME_STATUSES, GAME_SUBSTATUS } from '@/utils/constants'
  import { ArrowLeft } from '@element-plus/icons-vue'
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
  import { ElMessage } from 'element-plus'

  const props = defineProps({
      id: String
  })

  const route = useRoute()
  const router = useRouter()
  const gameStore = useGameStore()
  
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

  // Класс для круга в зависимости от статуса игры
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
  }

  .game-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 100%;
      padding: 0 16px;
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
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 2px solid #409eff;
      background-color: transparent;
      color: #409eff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
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
