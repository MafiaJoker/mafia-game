<template>
  <el-card class="players-table">
    <template #header>
      <div class="card-header">
        <span>Игроки</span>
        <div class="header-actions">
          <el-button 
            type="info" 
            text 
            @click="gameStore.gameState.rolesVisible = !gameStore.gameState.rolesVisible"
            >
            {{ gameStore.gameState.rolesVisible ? 'Скрыть роли' : 'Показать роли' }}
          </el-button>
        </div>
      </div>
    </template>

    <el-table :data="visiblePlayers" stripe style="width: 100%">
      <el-table-column prop="id" label="№" width="60" align="center" />
      
      <el-table-column label="Фолы" width="100" align="center">
        <template #default="{ row }">
          <PlayerFouls 
            :player="row" 
            @increment="handleIncrementFoul"
            @reset="handleResetFouls"
            />
        </template>
      </el-table-column>
      
      <el-table-column label="Роль" width="120" align="center">
        <template #default="{ row }">
          <PlayerRole 
            :player="row"
            :visible="gameStore.gameState.rolesVisible || !gameStore.gameState.isGameStarted"
            :editable="gameStore.isInRoleDistribution"
            @change-role="handleRoleChange"
            />
        </template>
      </el-table-column>
      
      <el-table-column label="Игрок" width="200">
        <template #default="{ row }">
          <PlayerSelector
            v-model="row.name"
            :player-id="row.id"
            :used-player-ids="getUsedPlayerIds(row.id)"
            @player-selected="handlePlayerSelected"
          />
        </template>
      </el-table-column>
      
      <el-table-column label="Номинация">
        <template #default="{ row }">
          <PlayerNomination 
            :player="row"
            :players="gameStore.alivePlayers"
            :game-state="gameStore.gameState"
            @nominate="handleNomination"
            />
        </template>
      </el-table-column>
      
      <el-table-column label="Действия" width="200" v-if="showPlayerActions">
        <template #default="{ row }">
          <PlayerActions 
            :player="row"
            @silent-now="handleSilentNow"
            @silent-next="handleSilentNext"
            @eliminate="handleEliminate"
            />
        </template>
      </el-table-column>
    </el-table>

    <div class="table-footer" v-if="gameStore.isGameInProgress">
      <el-space>
        <el-button 
          type="warning" 
          @click="showPpkDialog = true"
          :disabled="!canUsePpk"
          >
          ППК
        </el-button>
        
        <el-button 
          type="danger" 
          @click="showCancelDialog = true"
          >
          Отменить игру
        </el-button>
        
        <el-button 
          type="info" 
          @click="showEliminateDialog = true"
          >
          Удалить игрока
        </el-button>
      </el-space>
    </div>

    <!-- ППК контролы -->
    <PpkControls v-model="showPpkDialog" />
  </el-card>
</template>

<script setup>
  import { computed, ref } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { MAX_FOULS, GAME_STATUSES } from '@/utils/constants'
  import PlayerFouls from './PlayerFouls.vue'
  import PlayerRole from './PlayerRole.vue'
  import PlayerNomination from './PlayerNomination.vue'
  import PlayerActions from './PlayerActions.vue'
  import PlayerSelector from './PlayerSelector.vue'
  import PpkControls from './PpkControls.vue'
  import { ElMessage } from 'element-plus'

  const gameStore = useGameStore()

  const showPpkDialog = ref(false)
  const showCancelDialog = ref(false)
  const showEliminateDialog = ref(false)

  const visiblePlayers = computed(() => {
      return gameStore.gameState.players.filter(p => !p.isEliminated)
  })

  const getUsedPlayerIds = (currentPlayerId) => {
      return gameStore.gameState.players
          .filter(p => p.userId && p.id !== currentPlayerId)
          .map(p => p.userId)
  }

  const showPlayerActions = computed(() => {
      return gameStore.gameState.gameStatus === GAME_STATUSES.IN_PROGRESS
  })

  const canUsePpk = computed(() => {
      // ППК можно использовать только в определенных фазах
      return gameStore.isGameInProgress && 
          gameStore.gameState.round > 0
  })

  const handleIncrementFoul = (playerId) => {
      const player = gameStore.currentPlayer(playerId)
      if (!player) return

      if (player.fouls < MAX_FOULS.BEFORE_SILENCE || 
	  (player.fouls === MAX_FOULS.BEFORE_SILENCE && (player.isSilent || player.silentNextRound)) ||
	  player.fouls >= MAX_FOULS.BEFORE_ELIMINATION) {
	  gameStore.incrementFoul(playerId)
      }
  }

  const handleResetFouls = (playerId) => {
      const player = gameStore.currentPlayer(playerId)
      if (player) {
	  player.fouls = 0
	  ElMessage.success(`Фолы игрока ${player.name || `Игрок ${playerId}`} сброшены`)
      }
  }

  const handlePlayerSelected = ({ playerId, playerName, userId }) => {
      gameStore.updatePlayer(playerId, {
          name: playerName,
          userId: userId
      })
  }

  const handleRoleChange = (playerId) => {
      const newRole = gameStore.changePlayerRole(playerId)
      if (newRole) {
	  const player = gameStore.currentPlayer(playerId)
	  ElMessage.info(`Роль игрока ${player.nickname} изменена на ${newRole}`)
      }
  }

  const handleNomination = (nominatorId, nominatedId) => {
      gameStore.nominatePlayer(nominatorId, nominatedId)
  }

  const handleSilentNow = (playerId) => {
      const player = gameStore.currentPlayer(playerId)
      if (player) {
	  player.isSilent = true
	  ElMessage.warning(`Игрок ${player.nickname} молчит на этом кругу`)
      }
  }

  const handleSilentNext = (playerId) => {
      const player = gameStore.currentPlayer(playerId)
      if (player) {
	  player.silentNextRound = true
	  ElMessage.warning(`Игрок ${player.nickname} будет молчать на следующем кругу`)
      }
  }

  const handleEliminate = (playerId) => {
      ElMessageBox.confirm(
	  'Вы уверены, что хотите удалить этого игрока?',
	  'Подтверждение',
	  {
	      confirmButtonText: 'Да',
	      cancelButtonText: 'Отмена',
	      type: 'warning'
	  }
      ).then(() => {
	  gameStore.eliminatePlayer(playerId)
	  const player = gameStore.currentPlayer(playerId)
	  ElMessage.success(`Игрок ${player.nickname} удален из игры`)
      }).catch(() => {
	  // Отмена
      })
  }
</script>

<style scoped>
  .players-table {
      margin-top: 16px;
  }

  .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
  }

  .table-footer {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #ebeef5;
  }

  :deep(.el-table .el-table__row.silent) {
      background-color: #f56c6c !important;
      color: white;
  }

  :deep(.el-table .el-table__row.dead) {
      background-color: #909399 !important;
      color: white;
  }
</style>
