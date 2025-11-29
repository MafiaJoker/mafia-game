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

    <el-table :data="visiblePlayers" stripe style="width: 100%" :row-class-name="getRowClassName">
      <el-table-column label="№" width="60" align="center">
        <template #default="{ row }">
          <div class="player-number-cell">
            {{ row.id }}
          </div>
        </template>
      </el-table-column>
      
      <el-table-column v-if="gameStore.isGameInProgress" label="Фолы" width="100" align="center">
        <template #default="{ row }">
          <PlayerFouls 
            :player="row"
            :can-add-fouls="canAddFoulsToPlayer(row)"
            @increment="handleIncrementFoul"
            @reset="handleResetFouls"
            @silent-now="handleSilentNow"
            @silent-next="handleSilentNext"
            @eliminate="handleEliminate"
            />
        </template>
      </el-table-column>
      
      <el-table-column v-if="shouldShowRoleColumn" :width="isGameFinished ? '80' : '120'" :min-width="isGameFinished ? undefined : undefined" align="center">
        <template #header>
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>Роль</span>
            <el-button 
              v-if="!isGameFinished && (gameStore.isGameInProgress || gameStore.gameState.gameStatus === GAME_STATUSES.NEGOTIATION || gameStore.gameState.gameStatus === GAME_STATUSES.FREE_SEATING)"
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
            :visible="isGameFinished || gameStore.gameState.rolesVisible"
            :editable="gameStore.canEditRoles && !isGameFinished"
            @change-role="handleRoleChange"
            />
        </template>
      </el-table-column>
      
      <el-table-column label="Игрок" :width="isGameFinished ? undefined : '200'" :min-width="isGameFinished ? '200' : undefined">
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
            v-if="isEditingPlayers && canEditPlayers && row.isInGame !== false"
            v-model="row.name"
            :player-id="row.id"
            :used-player-ids="getUsedPlayerIds(row.id)"
            :event-id="gameStore.gameInfo?.eventId"
            :closed-seating="gameStore.gameInfo?.closedSeating || false"
            :registered-users="registeredUsers"
            @player-selected="handlePlayerSelected"
          />
          <span v-else-if="isEditingPlayers && canEditPlayers && row.isInGame === false" class="player-name-display disabled-slot">
            {{ row.name || `Слот ${row.id}` }} (не в игре)
          </span>
          <span v-else class="player-name-display" :class="{ 'empty-slot': !row.name }">
            {{ row.name || `Слот ${row.id}` }}
          </span>
        </template>
      </el-table-column>
      
      <el-table-column v-if="!isGameFinished" label="Выставление" min-width="120">
        <template #default="{ row }">
          <PlayerNominateButton 
            :player="row"
            :game-state="gameStore.gameState"
            @nominate="handlePlayerNominate"
            @remove-nomination="handleRemoveNomination"
            />
        </template>
      </el-table-column>
      
      <!-- Колонки баллов для завершенных игр -->
      <el-table-column v-if="isGameFinished" label="Авто" min-width="80" align="center">
        <template #default="{ row }">
          <span>{{ getPlayerPoints(row.id, 'auto_points') }}</span>
        </template>
      </el-table-column>
      
      <el-table-column v-if="isGameFinished" label="Доп." min-width="80" align="center">
        <template #default="{ row }">
          <span>{{ getPlayerPoints(row.id, 'extra_points') }}</span>
        </template>
      </el-table-column>
      
      <el-table-column v-if="isGameFinished" label="Штраф" min-width="80" align="center">
        <template #default="{ row }">
          <span>{{ getPlayerPoints(row.id, 'penalty_points') }}</span>
        </template>
      </el-table-column>
      
      <el-table-column v-if="isGameFinished" label="ЛХ" min-width="80" align="center">
        <template #default="{ row }">
          <span>{{ getPlayerPoints(row.id, 'best_move_points') }}</span>
        </template>
      </el-table-column>
      
      <el-table-column v-if="isGameFinished" label="Итого" min-width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getTotalPointsType(row)" size="large">
            {{ getTotalPoints(row).toFixed(1) }}
          </el-tag>
        </template>
      </el-table-column>
      
    </el-table>


  </el-card>
</template>

<script setup>
  import { computed, ref, onMounted, onBeforeUpdate, watch } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { MAX_FOULS, GAME_STATUSES, GAME_SUBSTATUS } from '@/utils/constants'
  import PlayerFouls from './PlayerFouls.vue'
  import PlayerRole from './PlayerRole.vue'
  import PlayerNominateButton from './PlayerNominateButton.vue'
  import PlayerActions from './PlayerActions.vue'
  import PlayerSelector from './PlayerSelector.vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Edit, View, Hide, Refresh, Upload } from '@element-plus/icons-vue'
  import { apiService } from '@/services/api'

  const gameStore = useGameStore()

  const isEditingPlayers = ref(false)
  const registeredUsers = ref([]) // Список зарегистрированных пользователей для закрытой рассадки
  
  const isGameFinished = computed(() => {
      return gameStore.gameState.gameStatus === 'civilians_win' || gameStore.gameState.gameStatus === 'mafia_win' || gameStore.gameState.gameStatus === 'draw'
  })
  
  const getPlayerPoints = (playerId, pointType) => {
      const gameData = gameStore.gameInfo?.gameData
      if (!gameData?.players) return 0
      
      const apiPlayer = gameData.players.find(p => p.box_id === playerId)
      if (!apiPlayer) return 0
      
      const value = apiPlayer[pointType]
      return value !== null && value !== undefined ? value : 0
  }
  
  const getTotalPoints = (player) => {
      const auto = getPlayerPoints(player.id, 'auto_points')
      const extra = getPlayerPoints(player.id, 'extra_points')
      const penalty = getPlayerPoints(player.id, 'penalty_points')
      const bestMove = getPlayerPoints(player.id, 'best_move_points')
      const total = auto + extra - penalty + bestMove
      return Math.round(total * 10) / 10  // Округляем до 1 знака после запятой
  }
  
  const getTotalPointsType = (player) => {
      const total = getTotalPoints(player)
      if (total > 0) return 'success'
      if (total < 0) return 'danger'
      return 'info'
  }

  const visiblePlayers = computed(() => {
      return gameStore.gameState.players
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
      const isGameFinished = gameStore.gameState.gameStatus === 'civilians_win' || 
                             gameStore.gameState.gameStatus === 'mafia_win' || 
                             gameStore.gameState.gameStatus === 'draw'
      const isSeatingConfirmed = gameStore.gameState.gameStatus === GAME_STATUSES.SEATING_READY
      return !gameStore.isGameInProgress && !isGameFinished && !isSeatingConfirmed
  })

  const togglePlayerEdit = () => {
      isEditingPlayers.value = !isEditingPlayers.value
  }
  
  const canAddFoulsToPlayer = (player) => {
      const isInProgress = gameStore.isGameInProgress
      const isAlive = player.isAlive
      const isFarewell = gameStore.gameState.gameSubstatus === GAME_SUBSTATUS.FAREWELL_MINUTE
      const isVotedOut = player.status === 'VOTED_OUT'
      
      // Логирование для отладки
      if (player.status === 'VOTED_OUT') {
          console.log(`Player ${player.id} (${player.name}):`, {
              isInProgress,
              isAlive,
              isFarewell,
              isVotedOut,
              gameSubstatus: gameStore.gameState.gameSubstatus
          })
      }
      
      return isInProgress && (isAlive || (isFarewell && isVotedOut))
  }

  const showPlayerActions = computed(() => {
      return gameStore.gameState.gameStatus === GAME_STATUSES.IN_PROGRESS
  })


  const shouldShowRoleColumn = computed(() => {
      return gameStore.gameState.gameStatus === GAME_STATUSES.ROLE_DISTRIBUTION ||
             gameStore.gameState.gameStatus === GAME_STATUSES.NEGOTIATION ||
             gameStore.gameState.gameStatus === GAME_STATUSES.FREE_SEATING ||
             gameStore.isGameInProgress ||
             isGameFinished.value
  })

  const showCardHeader = computed(() => {
      // Показываем шапку только если есть действия для показа (не только кнопка роли)
      const isGameFinished = gameStore.gameState.gameStatus === 'civilians_win' || 
                             gameStore.gameState.gameStatus === 'mafia_win' || 
                             gameStore.gameState.gameStatus === 'draw'
      return !gameStore.isGameInProgress && 
             gameStore.gameState.gameStatus !== GAME_STATUSES.NEGOTIATION && 
             gameStore.gameState.gameStatus !== GAME_STATUSES.FREE_SEATING &&
             !isGameFinished
  })

  const handleIncrementFoul = async (playerId) => {
      const player = gameStore.currentPlayer(playerId)
      if (!player) return

      // Всегда вызываем addFoul, логика сброса теперь внутри функции
      await gameStore.addFoul(playerId)
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

  const handlePlayerNominate = (playerId) => {
      // Добавляем игрока в список номинированных в порядке выставления
      if (!gameStore.gameState.nominatedPlayers.includes(playerId)) {
          gameStore.gameState.nominatedPlayers.push(playerId)
      }
  }

  const handleRemoveNomination = (playerId) => {
      // Удаляем игрока из списка номинированных
      const index = gameStore.gameState.nominatedPlayers.indexOf(playerId)
      if (index !== -1) {
          gameStore.gameState.nominatedPlayers.splice(index, 1)
      }
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
      const confirmMessage = gameStore.gameInfo?.eventId
          ? 'Вы уверены, что хотите случайно рассадить участников события по столу?'
          : 'Вы уверены, что хотите случайно рассадить игроков из базы данных по столу?'
      
      ElMessageBox.confirm(
	  confirmMessage,
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

  const getRowClassName = ({ row }) => {
      if (!isGameFinished.value) {
          if (row.isInGame === false || !row.isAlive) {
              return 'dead'
          }
      }
      return ''
  }

  // Функция загрузки зарегистрированных пользователей для закрытой рассадки
  const loadRegisteredUsers = async () => {
      // Загружаем только если включена закрытая рассадка и есть eventId
      if (!gameStore.gameInfo?.closedSeating || !gameStore.gameInfo?.eventId) {
          registeredUsers.value = []
          return
      }

      try {
          const response = await apiService.getEventRegistrations(gameStore.gameInfo.eventId, {
              status: 'confirmed',
              pageSize: 100
          })
          registeredUsers.value = (response.items || []).map(reg => ({
              nickname: reg.user?.nickname || reg.user_nickname,
              id: reg.user?.id || reg.user_id,
              value: reg.user?.nickname || reg.user_nickname
          }))
      } catch (error) {
          console.error('Error loading registered users:', error)
          registeredUsers.value = []
      }
  }

  // Загружаем при монтировании компонента
  onMounted(() => {
      loadRegisteredUsers()
  })

  // Перезагружаем при изменении closedSeating или eventId
  watch([() => gameStore.gameInfo?.closedSeating, () => gameStore.gameInfo?.eventId], () => {
      loadRegisteredUsers()
  })
  
  // Автоматически отключаем редактирование при изменении статуса игры
  watch(() => gameStore.gameState.gameStatus, () => {
      if (!canEditPlayers.value && isEditingPlayers.value) {
          isEditingPlayers.value = false
      }
  })
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
      background-color: #f5f7fa !important;
      color: #c0c4cc !important;
      opacity: 0.6;
  }

  :deep(.el-table .el-table__row.not-in-game) {
      background-color: #f5f7fa !important;
      color: #c0c4cc !important;
      opacity: 0.6;
  }

  :deep(.el-table .el-table__row.not-in-game .el-button) {
      opacity: 0.5;
      pointer-events: none;
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

  .disabled-slot {
      color: #c0c4cc !important;
      font-style: italic;
      opacity: 0.6;
  }

  /* Стили для ячейки с номером игрока */
  .player-number-cell {
      position: relative;
      padding: 8px;
  }

</style>
