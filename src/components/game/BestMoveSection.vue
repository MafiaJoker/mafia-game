<template>
  <el-card class="best-move-section mb-4">
    <template #header>
      <div class="card-header">
        <el-icon><Star /></el-icon>
        <span>Лучший ход</span>
        <el-badge :value="selectedCount" :max="3" class="ml-2">
          <span class="selected-count">Выбрано: {{ selectedCount }}/3</span>
        </el-badge>
      </div>
    </template>

    <div class="best-move-content">
      <div class="best-move-info mb-4">
        <el-alert
          :title="bestMovePlayerInfo"
          type="info"
          :closable="false"
          show-icon
          />
      </div>

      <div class="players-selection">
        <h6 class="section-title">Выберите 3 игроков для лучшего хода:</h6>
        
        <div class="players-grid">
          <el-button
            v-for="player in availablePlayers"
            :key="player.id"
            :type="getPlayerButtonType(player.id)"
            size="large"
            @click="togglePlayer(player.id)"
            :disabled="!canSelectPlayer(player.id)"
            class="player-button"
            >
            <div class="player-info">
              <div class="player-number">{{ player.id }}</div>
              <div class="player-name">{{ player.name }}</div>
            </div>
          </el-button>
        </div>
      </div>

      <div class="best-move-actions mt-4">
        <el-button
          type="success"
          size="large"
          @click="confirmBestMove"
          :disabled="selectedCount !== 3"
          style="width: 100%"
          >
          <el-icon><Check /></el-icon>
          Подтвердить лучший ход
        </el-button>
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
	  return `Лучший ход для игрока ${firstDead}: ${player?.name || 'Неизвестно'}`
      }
      return 'Лучший ход'
  })

  const getPlayerButtonType = (playerId) => {
      return gameStore.gameState.bestMoveTargets.has(playerId) ? 'success' : 'default'
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

  const confirmBestMove = () => {
      if (selectedCount.value !== 3) {
	  ElMessage.error('Необходимо выбрать ровно 3 игроков')
	  return
      }
      
      gameStore.gameState.bestMoveUsed = true
      gameStore.gameState.showBestMove = false
      gameStore.gameState.bestMoveTargets.clear()
      
      ElMessage.success('Лучший ход подтвержден')
  }
</script>

<style scoped>
  .best-move-section {
      border: 2px solid #f56c6c;
      background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
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
      padding: 8px 0;
  }

  .section-title {
      margin: 0 0 16px 0;
      font-weight: 600;
      color: #303133;
      text-align: center;
  }

  .players-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
  }

  .player-button {
      height: 80px;
      transition: all 0.3s ease;
  }

  .player-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .player-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
  }

  .player-number {
      font-size: 20px;
      font-weight: bold;
  }

  .player-name {
      font-size: 12px;
      opacity: 0.8;
  }

  .best-move-actions {
      text-align: center;
      padding-top: 16px;
      border-top: 1px solid #ebeef5;
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
