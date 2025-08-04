<template>
  <div class="game-controls">
    <!-- Кнопки для статуса SEATING_READY -->
    <template v-if="gameState.gameStatus === GAME_STATUSES.SEATING_READY">
      <el-button 
        type="primary" 
        @click="startRoleDistribution"
        :icon="ArrowRight"
        title="Начать раздачу ролей"
      />
    </template>

    <!-- Кнопки для статуса ROLE_DISTRIBUTION -->
    <template v-if="gameState.gameStatus === GAME_STATUSES.ROLE_DISTRIBUTION">
      <el-button 
        type="danger" 
        @click="cancelRoleDistribution"
        :icon="Close"
        title="Отменить раздачу"
      />
      <el-button 
        type="success" 
        @click="startNegotiation"
        :disabled="!gameStore.canStartGame"
        :icon="Check"
        title="Начать договорку"
      />
    </template>

    <!-- Кнопки для статуса NEGOTIATION -->
    <template v-if="gameState.gameStatus === GAME_STATUSES.NEGOTIATION">
      <el-button type="info" @click="skipToFreeSeating">
        Свободная посадка
      </el-button>
    </template>

    <!-- Кнопки для статуса FREE_SEATING -->
    <template v-if="gameState.gameStatus === GAME_STATUSES.FREE_SEATING">
      <el-button 
        type="success" 
        @click="startGame"
        size="large"
	>
        Начать игру
      </el-button>
    </template>

    <!-- Кнопки для процесса игры -->
    <template v-if="gameState.gameStatus === GAME_STATUSES.IN_PROGRESS">
      <div v-if="gameState.gameSubstatus === GAME_SUBSTATUS.DISCUSSION || 
                  gameState.gameSubstatus === GAME_SUBSTATUS.CRITICAL_DISCUSSION"
           class="voting-controls">
        <el-button 
          type="warning" 
          @click="startVoting"
          v-if="shouldShowVotingButton"
          >
          Начать голосование
        </el-button>
        <el-button 
          type="info" 
          @click="goToNight"
          v-if="shouldShowNightButton"
          :icon="Moon"
        />
      </div>

      <div v-if="gameState.gameSubstatus === GAME_SUBSTATUS.VOTING"
           class="voting-controls">
        <el-button 
          type="success" 
          @click="confirmVoting"
          :icon="Check"
        />
        <el-button 
          type="danger" 
          @click="cancelVoting"
          :icon="Close"
        />
      </div>

      <div v-if="gameState.gameSubstatus === GAME_SUBSTATUS.NIGHT"
           class="voting-controls">
        <el-button 
          type="warning" 
          @click="goToDay"
          :icon="ArrowLeft"
        />
        <el-button 
          type="success" 
          @click="confirmNight"
          :icon="Check"
        />
      </div>

      <template v-if="gameState.gameSubstatus === GAME_SUBSTATUS.SUSPECTS_SPEECH">
        <el-button type="primary" @click="goToFarewell">
          К прощальной минуте
        </el-button>
      </template>

      <template v-if="gameState.gameSubstatus === GAME_SUBSTATUS.FAREWELL_MINUTE">
        <el-button 
          type="info" 
          @click="goToNight"
          :icon="Moon"
        />
      </template>
    </template>

    <!-- Кнопки для завершенной игры без баллов -->
    <template v-if="gameState.gameStatus === GAME_STATUSES.FINISHED_NO_SCORES">
      <el-button type="success" @click="showScoreDialog">
        Выставить баллы
      </el-button>
    </template>

    <!-- Лучший ход -->
    <template v-if="showBestMoveControls">
      <el-badge :value="bestMoveSelected" :max="3">
        <el-button 
          type="warning" 
          @click="confirmBestMove"
          :disabled="bestMoveSelected !== 3"
          >
          Подтвердить ЛХ
        </el-button>
      </el-badge>
    </template>
  </div>
</template>

<script setup>
  import { computed, watch } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { useVotingStore } from '@/stores/voting'
  import { useNightActionsStore } from '@/stores/nightActions'
  import { 
      GAME_STATUSES, 
      GAME_SUBSTATUS 
  } from '@/utils/constants'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Check, Close, ArrowLeft, Moon, ArrowRight } from '@element-plus/icons-vue'

  const gameStore = useGameStore()
  const votingStore = useVotingStore()
  const nightActionsStore = useNightActionsStore()

  const gameState = computed(() => gameStore.gameState)

  const nominatedPlayersCount = computed(() => {
      return gameStore.nominatedPlayers.length
  })

  // Показывать кнопку голосования
  const shouldShowVotingButton = computed(() => {
    if (nominatedPlayersCount.value === 0) return false
    
    // На первом круге нужно минимум 2 кандидатуры
    if (gameState.value.round === 1) {
      return nominatedPlayersCount.value >= 2
    }
    
    // На остальных кругах показываем при любом количестве номинаций
    return nominatedPlayersCount.value > 0
  })

  // Показывать кнопку "В ночь"
  const shouldShowNightButton = computed(() => {
    // На первом круге кнопка "В ночь" доступна если меньше 2 кандидатур
    if (gameState.value.round === 1) {
      return nominatedPlayersCount.value < 2
    }
    
    // На остальных кругах кнопка "В ночь" доступна только если нет номинаций
    return nominatedPlayersCount.value === 0
  })

  const showBestMoveControls = computed(() => {
      return gameState.value.showBestMove
  })

  const bestMoveSelected = computed(() => {
      return gameState.value.bestMoveTargets.size
  })

  const startRoleDistribution = () => {
      gameStore.setGameStatus(GAME_STATUSES.ROLE_DISTRIBUTION)
      // ElMessage.info('Распределите роли между игроками')
  }

  const cancelRoleDistribution = () => {
      // Сбрасываем все роли на null
      gameState.value.players.forEach(player => {
	  player.role = null
	  player.originalRole = null
      })
      
      gameStore.setGameStatus(GAME_STATUSES.SEATING_READY)
      // ElMessage.info('Раздача ролей отменена')
  }

  const startNegotiation = () => {
      if (!gameStore.canStartGame) {
	  // ElMessage.error('Необходимо распределить 2 мафии, 1 дона и 1 шерифа!')
	  return
      }
      
      gameStore.setGameStatus(GAME_STATUSES.NEGOTIATION)
      // ElMessage.info('Договорка началась (1 минута)')
  }

  const skipToFreeSeating = () => {
      gameStore.setGameStatus(GAME_STATUSES.FREE_SEATING)
      // ElMessage.info('Свободная посадка (40 секунд)')
  }

  const startGame = async () => {
      if (!gameStore.canStartGame) {
	  // ElMessage.error('Необходимо распределить 2 мафии, 1 дона и 1 шерифа!')
	  return
      }

      try {
          await gameStore.startGame()
          // ElMessage.success('Игра началась!')
      } catch (error) {
          console.error('Ошибка при запуске игры:', error)
          // ElMessage.error('Ошибка при запуске игры: ' + error.message)
      }
  }

  const startVoting = () => {
      // На первом круге нужно минимум 2 кандидатуры
      if (gameState.value.round === 1 && nominatedPlayersCount.value < 2) {
          ElMessage.warning('На первом кругу необходимо минимум 2 кандидатуры для голосования')
          return
      }
      
      // На других кругах: если одна кандидатура, игрок автоматически выбывает
      if (nominatedPlayersCount.value === 1 && gameState.value.round > 1) {
	  // Единственная кандидатура автоматически выбывает
	  const playerId = gameStore.nominatedPlayers[0]
	  const player = gameStore.currentPlayer(playerId)
	  
	  // ElMessage.warning(`Игрок ${player.nickname} автоматически выбывает как единственная кандидатура`)
	  gameStore.eliminatePlayer(playerId)
	  
	  // Очищаем номинации
	  gameState.value.players.forEach(p => { p.nominated = null })
	  
	  return
      }
      
      // Всегда позволяем начать голосование - судья сам решает
      votingStore.startVoting()
  }

  const confirmVoting = () => {
      votingStore.confirmVoting()
  }


  const cancelVoting = () => {
      gameStore.setGameStatus(
	  gameStore.gameState.gameStatus,
	  gameStore.isCriticalRound ? GAME_SUBSTATUS.CRITICAL_DISCUSSION : GAME_SUBSTATUS.DISCUSSION
      )
      gameState.value.votingResults = {}
      gameState.value.shootoutPlayers = []
  }

  const goToNight = () => {
      gameStore.setGameStatus(gameStore.gameState.gameStatus, GAME_SUBSTATUS.NIGHT)
      
      // Сброс ночных целей
      gameState.value.mafiaTarget = null
      gameState.value.donTarget = null
      gameState.value.sheriffTarget = null
      gameState.value.nominatedPlayers = []

      // Очистка всех номинаций
      gameState.value.players.forEach(p => {
	  p.nominated = null
      })
  }

  const confirmNight = () => {
      nightActionsStore.confirmNight()
  }

  const goToDay = () => {
      gameStore.setGameStatus(
          gameStore.gameState.gameStatus, 
          gameStore.isCriticalRound ? GAME_SUBSTATUS.CRITICAL_DISCUSSION : GAME_SUBSTATUS.DISCUSSION
      )
      // Не увеличиваем раунд при возврате из ночи без подтверждения
  }

  const goToFarewell = () => {
      gameStore.setGameStatus(gameStore.gameState.gameStatus, GAME_SUBSTATUS.FAREWELL_MINUTE)
  }

  const confirmBestMove = () => {
      gameState.value.bestMoveUsed = true
      gameState.value.showBestMove = false
      // ElMessage.success('Лучший ход подтвержден')
  }

  const showScoreDialog = () => {
      // Эмитим событие для показа диалога баллов
      // Это будет обработано в родительском компоненте
  }
</script>

<style scoped>
  .game-controls {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      min-width: 180px;
      justify-content: flex-end;
  }

  .voting-controls {
      min-width: 180px;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
  }

  @media (max-width: 768px) {
      .game-controls {
	  justify-content: center;
      }
      
      .voting-controls {
	  justify-content: center;
      }
  }
</style>
