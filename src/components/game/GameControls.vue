<template>
  <div class="game-controls">
    <!-- Кнопки для статуса SEATING_READY -->
    <template v-if="gameState.gameStatus === GAME_STATUSES.SEATING_READY">
      <el-button type="primary" @click="startRoleDistribution">
        Начать раздачу ролей
      </el-button>
    </template>

    <!-- Кнопки для статуса ROLE_DISTRIBUTION -->
    <template v-if="gameState.gameStatus === GAME_STATUSES.ROLE_DISTRIBUTION">
      <el-button type="warning" @click="cancelRoleDistribution">
        Отменить раздачу
      </el-button>
      <el-button 
        type="success" 
        @click="startGame"
        :disabled="!gameStore.canStartGame"
	>
        Начать игру
      </el-button>
    </template>

    <!-- Кнопки для процесса игры -->
    <template v-if="gameState.gameStatus === GAME_STATUSES.IN_PROGRESS">
      <template v-if="gameState.gameSubstatus === GAME_SUBSTATUS.DISCUSSION || 
                      gameState.gameSubstatus === GAME_SUBSTATUS.CRITICAL_DISCUSSION">
        <el-button 
          type="warning" 
          @click="startVoting"
          :disabled="nominatedPlayersCount === 0"
          >
          Начать голосование
        </el-button>
        <el-button 
          type="info" 
          @click="goToNight"
          v-if="nominatedPlayersCount === 0"
          >
          В ночь
        </el-button>
      </template>

      <template v-if="gameState.gameSubstatus === GAME_SUBSTATUS.VOTING">
        <el-button type="success" @click="confirmVoting">
          Подтвердить голосование
        </el-button>
        <el-button type="danger" @click="resetVoting">
          Начать заново
        </el-button>
        <el-button type="info" @click="cancelVoting">
          Отменить голосование
        </el-button>
      </template>

      <template v-if="gameState.gameSubstatus === GAME_SUBSTATUS.NIGHT">
        <el-button type="success" @click="confirmNight">
          Подтвердить итоги ночи
        </el-button>
      </template>

      <template v-if="gameState.gameSubstatus === GAME_SUBSTATUS.SUSPECTS_SPEECH">
        <el-button type="primary" @click="goToFarewell">
          К прощальной минуте
        </el-button>
      </template>

      <template v-if="gameState.gameSubstatus === GAME_SUBSTATUS.FAREWELL_MINUTE">
        <el-button type="info" @click="goToNight">
          В ночь
        </el-button>
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
  import { computed } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { useVotingStore } from '@/stores/voting'
  import { useNightActionsStore } from '@/stores/nightActions'
  import { 
      GAME_STATUSES, 
      GAME_SUBSTATUS 
  } from '@/utils/constants'
  import { ElMessage, ElMessageBox } from 'element-plus'

  const gameStore = useGameStore()
  const votingStore = useVotingStore()
  const nightActionsStore = useNightActionsStore()

  const gameState = computed(() => gameStore.gameState)

  const nominatedPlayersCount = computed(() => {
      return gameState.value.nominatedPlayers.length
  })

  const showBestMoveControls = computed(() => {
      return gameState.value.showBestMove
  })

  const bestMoveSelected = computed(() => {
      return gameState.value.bestMoveTargets.size
  })

  const startRoleDistribution = () => {
      gameStore.setGameStatus(GAME_STATUSES.ROLE_DISTRIBUTION)
      ElMessage.info('Распределите роли между игроками')
  }

  const cancelRoleDistribution = () => {
      // Сбрасываем все роли на "Мирный"
      gameState.value.players.forEach(player => {
	  player.role = 'Мирный'
	  player.originalRole = 'Мирный'
      })
      
      gameStore.setGameStatus(GAME_STATUSES.SEATING_READY)
      ElMessage.info('Раздача ролей отменена')
  }

  const startGame = async () => {
      if (!gameStore.canStartGame) {
	  ElMessage.error('Необходимо распределить 2 мафии, 1 дона и 1 шерифа!')
	  return
      }

      gameStore.setGameStatus(GAME_STATUSES.IN_PROGRESS, GAME_SUBSTATUS.DISCUSSION)
      gameState.value.isGameStarted = true
      gameState.value.round = 1

      await gameStore.saveGameState()
      ElMessage.success('Игра началась!')
  }

  const startVoting = () => {
      if (nominatedPlayersCount.value === 1 && gameState.value.round > 0) {
	  // Единственная кандидатура автоматически выбывает
	  const playerId = gameState.value.nominatedPlayers[0]
	  const player = gameStore.currentPlayer(playerId)
	  
	  ElMessage.warning(`Игрок ${player.name} автоматически выбывает как единственная кандидатура`)
	  gameStore.eliminatePlayer(playerId)
	  
	  gameState.value.nominatedPlayers = []
	  gameState.value.players.forEach(p => { p.nominated = null })
	  
	  return
      }
      
      votingStore.startVoting()
  }

  const confirmVoting = () => {
      votingStore.confirmVoting()
  }

  const resetVoting = () => {
      votingStore.resetVoting()
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

  const goToFarewell = () => {
      gameStore.setGameStatus(gameStore.gameState.gameStatus, GAME_SUBSTATUS.FAREWELL_MINUTE)
  }

  const confirmBestMove = () => {
      gameState.value.bestMoveUsed = true
      gameState.value.showBestMove = false
      ElMessage.success('Лучший ход подтвержден')
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
  }

  @media (max-width: 768px) {
      .game-controls {
	  justify-content: center;
      }
  }
</style>
