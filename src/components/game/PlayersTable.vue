<template>
  <el-card class="players-table">
    <template #header v-if="showCardHeader">
      <div class="card-header">
        <span>Игроки</span>
        <div class="header-actions">
          <el-button 
            v-if="!gameStore.isGameInProgress && gameStore.gameState.gameStatus !== GAME_STATUSES.ROLE_DISTRIBUTION && gameStore.gameState.gameStatus !== GAME_STATUSES.NEGOTIATION && gameStore.gameState.gameStatus !== GAME_STATUSES.FREE_SEATING"
            type="warning" 
            size="small"
            :icon="Refresh"
            circle
            @click="handleShufflePlayers"
            title="Перемешать игроков"
          />
          <el-button 
            v-if="canConfirmSeating && !isSeatingReady && gameStore.gameState.gameStatus !== GAME_STATUSES.ROLE_DISTRIBUTION && gameStore.gameState.gameStatus !== GAME_STATUSES.NEGOTIATION && gameStore.gameState.gameStatus !== GAME_STATUSES.FREE_SEATING"
            type="success" 
            size="small"
            @click="handleConfirmSeating"
            >
            Рассадка готова
          </el-button>
          <el-button 
            v-if="canConfirmSeating && isSeatingReady && gameStore.gameState.gameStatus !== GAME_STATUSES.ROLE_DISTRIBUTION && gameStore.gameState.gameStatus !== GAME_STATUSES.NEGOTIATION && gameStore.gameState.gameStatus !== GAME_STATUSES.FREE_SEATING"
            type="primary" 
            size="small"
            :icon="Upload"
            circle
            @click="handleUpdateSeating"
            title="Обновить рассадку"
          />
        </div>
      </div>
    </template>

    <el-table :data="visiblePlayers" stripe style="width: 100%">
      <el-table-column prop="id" label="№" width="60" align="center" />
      
      <el-table-column v-if="gameStore.isGameInProgress" label="Фолы" width="100" align="center">
        <template #default="{ row }">
          <PlayerFouls 
            :player="row"
            :can-add-fouls="gameStore.isGameInProgress"
            @increment="handleIncrementFoul"
            @reset="handleResetFouls"
            @silent-now="handleSilentNow"
            @silent-next="handleSilentNext"
            @eliminate="handleEliminate"
            />
        </template>
      </el-table-column>
      
      <el-table-column v-if="shouldShowRoleColumn" width="120" align="center">
        <template #header>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>Роль</span>
            <el-button 
              v-if="gameStore.isGameInProgress || gameStore.gameState.gameStatus === GAME_STATUSES.NEGOTIATION || gameStore.gameState.gameStatus === GAME_STATUSES.FREE_SEATING"
              :type="gameStore.gameState.rolesVisible ? 'primary' : 'default'"
              :icon="gameStore.gameState.rolesVisible ? Hide : View"
              size="small"
              circle
              @click="gameStore.gameState.rolesVisible = !gameStore.gameState.rolesVisible"
              :title="gameStore.gameState.rolesVisible ? 'Скрыть роли' : 'Показать роли'"
            />
          </div>
        </template>
        <template #default="{ row }">
          <PlayerRole 
            :player="row"
            :visible="gameStore.gameState.rolesVisible || 
                     gameStore.gameState.gameStatus === GAME_STATUSES.ROLE_DISTRIBUTION"
            :editable="gameStore.canEditRoles"
            @change-role="handleRoleChange"
            />
        </template>
      </el-table-column>
      
      <el-table-column label="Игрок" width="200">
        <template #header>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>Игрок</span>
            <el-button
              v-if="canEditPlayers"
              :type="isEditingPlayers ? 'primary' : 'default'"
              :icon="Edit"
              size="small"
              circle
              @click="togglePlayerEdit"
            />
          </div>
        </template>
        <template #default="{ row }">
          <PlayerSelector
            v-if="isEditingPlayers"
            v-model="row.name"
            :player-id="row.id"
            :used-player-ids="getUsedPlayerIds(row.id)"
            @player-selected="handlePlayerSelected"
          />
          <span v-else class="player-name-display" :class="{ 'empty-slot': !row.name }">
            {{ row.name || `Слот ${row.id}` }}
          </span>
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
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Edit, View, Hide, Refresh, Upload } from '@element-plus/icons-vue'

  const gameStore = useGameStore()

  const showPpkDialog = ref(false)
  const showCancelDialog = ref(false)
  const showEliminateDialog = ref(false)
  const isEditingPlayers = ref(false)

  const visiblePlayers = computed(() => {
      return gameStore.gameState.players.filter(p => !p.isEliminated)
  })

  const getUsedPlayerIds = (currentPlayerId) => {
      return gameStore.gameState.players
          .filter(p => p.userId && p.id !== currentPlayerId)
          .map(p => p.userId)
  }


  const hasPlayersToShuffle = computed(() => {
      const playersWithNames = gameStore.gameState.players.filter(p => p.name && p.name.trim() !== '')
      return playersWithNames.length >= 2 && !gameStore.isGameInProgress
  })

  const canConfirmSeating = computed(() => {
      const hasPlayers = gameStore.gameState.players.some(p => p.name && p.name.trim() !== '')
      const gameNotStarted = gameStore.gameState.gameStatus !== GAME_STATUSES.IN_PROGRESS
      return hasPlayers && gameNotStarted
  })

  const isSeatingReady = computed(() => {
      return gameStore.gameState.gameStatus === GAME_STATUSES.SEATING_READY
  })

  const canEditPlayers = computed(() => {
      return !gameStore.isGameInProgress
  })

  const togglePlayerEdit = () => {
      isEditingPlayers.value = !isEditingPlayers.value
  }

  const showPlayerActions = computed(() => {
      return gameStore.gameState.gameStatus === GAME_STATUSES.IN_PROGRESS
  })

  const canUsePpk = computed(() => {
      // ППК можно использовать только в определенных фазах
      return gameStore.isGameInProgress && 
          gameStore.gameState.round > 0
  })

  const shouldShowRoleColumn = computed(() => {
      return gameStore.gameState.gameStatus === GAME_STATUSES.ROLE_DISTRIBUTION ||
             gameStore.gameState.gameStatus === GAME_STATUSES.NEGOTIATION ||
             gameStore.gameState.gameStatus === GAME_STATUSES.FREE_SEATING ||
             gameStore.isGameInProgress
  })

  const showCardHeader = computed(() => {
      // Показываем шапку только если есть действия для показа (не только кнопка роли)
      return !gameStore.isGameInProgress && 
             gameStore.gameState.gameStatus !== GAME_STATUSES.NEGOTIATION && 
             gameStore.gameState.gameStatus !== GAME_STATUSES.FREE_SEATING
  })

  const handleIncrementFoul = async (playerId) => {
      const player = gameStore.currentPlayer(playerId)
      if (!player) return

      if (player.fouls < MAX_FOULS.BEFORE_SILENCE || 
	  (player.fouls === MAX_FOULS.BEFORE_SILENCE && (player.isSilent || player.silentNextRound)) ||
	  player.fouls >= MAX_FOULS.BEFORE_ELIMINATION) {
	  await gameStore.addFoul(playerId)
      }
  }

  const handleResetFouls = async (playerId) => {
      await gameStore.resetPlayerFouls(playerId)
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
	  // ElMessage.info(`Роль игрока ${player.nickname} изменена на ${newRole}`)
      }
  }

  const handleNomination = (nominatorId, nominatedId) => {
      gameStore.nominatePlayer(nominatorId, nominatedId)
  }

  const handleSilentNow = (playerId) => {
      const player = gameStore.currentPlayer(playerId)
      if (player) {
	  player.isSilent = true
	  // ElMessage.warning(`Игрок ${player.nickname} молчит на этом кругу`)
      }
  }

  const handleSilentNext = (playerId) => {
      const player = gameStore.currentPlayer(playerId)
      if (player) {
	  player.silentNextRound = true
	  // ElMessage.warning(`Игрок ${player.nickname} будет молчать на следующем кругу`)
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
	  // ElMessage.success(`Игрок ${player.nickname} удален из игры`)
      }).catch(() => {
	  // Отмена
      })
  }

  const handleShufflePlayers = () => {
      ElMessageBox.confirm(
	  'Вы уверены, что хотите случайно рассадить игроков из базы данных по столу?',
	  'Подтверждение перемешивания',
	  {
	      confirmButtonText: 'Да, рассадить',
	      cancelButtonText: 'Отмена',
	      type: 'warning'
	  }
      ).then(async () => {
	  const result = await gameStore.shufflePlayers()
	  if (result.success) {
	      // ElMessage.success(result.message)
	  } else {
	      // ElMessage.warning(result.message)
	  }
      }).catch(() => {
	  // Отмена
      })
  }

  const handleConfirmSeating = () => {
      ElMessageBox.confirm(
	  'Вы уверены, что хотите подтвердить рассадку и сохранить игроков с ролями на сервере?',
	  'Подтверждение рассадки',
	  {
	      confirmButtonText: 'Да, сохранить',
	      cancelButtonText: 'Отмена',
	      type: 'success'
	  }
      ).then(async () => {
	  const result = await gameStore.confirmSeating()
	  if (result.success) {
	      // ElMessage.success(result.message)
	  } else {
	      // ElMessage.error(result.message)
	  }
      }).catch(() => {
	  // Отмена
      })
  }

  const handleUpdateSeating = async () => {
      const result = await gameStore.updateSeating()
      if (result.success) {
	  // ElMessage.success(result.message)
      } else {
	  // ElMessage.error(result.message)
      }
  }
</script>

<style scoped>
  .players-table {
      margin-top: 4px;
  }

  .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
  }

  .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
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

  .player-name-display {
      padding: 8px;
      min-height: 32px;
      display: flex;
      align-items: center;
  }

  .empty-slot {
      color: #909399;
      font-style: italic;
  }
</style>
