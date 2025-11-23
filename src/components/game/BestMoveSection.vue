<template>
  <el-card class="best-move-section mb-4">
    <div class="best-move-content">
      <div class="best-move-info mb-4">
        <el-alert
          :title="bestMovePlayerInfo"
          type="success"
          :closable="false"
          show-icon
          />
      </div>

      <div class="players-selection">
        <el-button-group>
          <el-button
            v-for="player in availablePlayers"
            :key="player.id"
            :type="getPlayerButtonType(player.id)"
            @click="togglePlayer(player.id)"
            :disabled="!canSelectPlayer(player.id)"
            >
            {{ player.id }}
          </el-button>
        </el-button-group>
      </div>
    </div>
  </el-card>
</template>

<script setup>
  import { computed } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { ElMessage } from 'element-plus'
  import { 
      Star, 
      Check 
  } from '@element-plus/icons-vue'

  const gameStore = useGameStore()

  const availablePlayers = computed(() => {
      return gameStore.gameState.players.filter(p => p.isAlive && !p.isEliminated)
  })

  const selectedCount = computed(() => {
      return gameStore.gameState.bestMoveTargets.size
  })

  const bestMovePlayerInfo = computed(() => {
      const firstDead = gameStore.gameState.deadPlayers[0]
      if (firstDead) {
	  const player = gameStore.currentPlayer(firstDead)
	  return `${firstDead}: ${player?.name || 'Неизвестно'}`
      }
      return 'Лучший ход'
  })

  const getPlayerButtonType = (playerId) => {
      return gameStore.gameState.bestMoveTargets.has(playerId) ? 'success' : 'info'
  }

  const canSelectPlayer = (playerId) => {
      return gameStore.gameState.bestMoveTargets.has(playerId) || 
          gameStore.gameState.bestMoveTargets.size < 3
  }

  const togglePlayer = (playerId) => {
      const targets = gameStore.gameState.bestMoveTargets
      
      if (targets.has(playerId)) {
	  targets.delete(playerId)
      } else if (targets.size < 3) {
	  targets.add(playerId)
      }
  }

  const confirmBestMove = async () => {
      if (selectedCount.value === 3) {
          // Получаем gamePhasesStore
          const { useGamePhasesStore } = await import('@/stores/gamePhases')
          const gamePhasesStore = useGamePhasesStore()
          
          // 1. Записываем лучший ход в ТЕКУЩУЮ фазу (не создаем новую)
          gamePhasesStore.setBestMove([...gameStore.gameState.bestMoveTargets])
          
          // 2. Обновляем текущую фазу на сервере с лучшим ходом
          await gamePhasesStore.updateCurrentPhaseOnServer()
          
          // 3. ТЕПЕРЬ создаем новую фазу (увеличиваем currentPhaseId)
          gamePhasesStore.nextPhase()
          
          // 4. Создаем новую пустую фазу на сервере
          await gamePhasesStore.createPhaseOnServer()
          
          // 5. Синхронизируем раунд с фазами
          gameStore.gameState.round = gamePhasesStore.currentPhaseId
          
          // 5.1. Сбрасываем флаг голосования для нового раунда
          gameStore.gameState.votingHappenedThisRound = false
          
          // 5.2. Синхронизируем статусы игроков с фазами
          gameStore.syncPlayersWithPhases()
          
          // 6. Переходим к обсуждению нового дня
          const { GAME_SUBSTATUS } = await import('@/utils/constants')
          gameStore.setGameStatus(gameStore.gameState.gameStatus, GAME_SUBSTATUS.DISCUSSION)
          
          // 7. Обновляем состояние игры
          gameStore.gameState.bestMoveUsed = true
          gameStore.gameState.showBestMove = false
          gameStore.gameState.bestMoveTargets.clear()
      }
  }
</script>

<style scoped>
  .best-move-section {
      border: 2px solid #67c23a;
      background: linear-gradient(135deg, #f0f9ff 0%, #e1f5fe 100%);
  }

  .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #f56c6c;
  }

  .selected-count {
      font-size: 14px;
      color: #606266;
  }

  .best-move-content {
      padding: 0;
  }

  .players-selection {
      display: flex;
      justify-content: flex-start;
  }

  .ml-2 {
      margin-left: 8px;
  }

  .mb-4 {
      margin-bottom: 16px;
  }

  .mt-4 {
      margin-top: 16px;
  }
</style>
