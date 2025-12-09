<template>
  <div class="game-in-progress">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><User /></el-icon>
            <span>Игра в процессе</span>
            <span v-if="displayPhase !== null" class="phase-indicator">День {{ displayPhase }}</span>
          </div>
          <div class="header-right">
            <el-button
              v-if="nextRoundButtonVisible"
              type="primary"
              size="default"
              @click="handleNextRound"
            >
              Следующий круг
            </el-button>
            <el-button
              v-else-if="showVotingButton"
              type="primary"
              size="default"
              @click="openVotingDialog"
            >
              Начать голосование
            </el-button>
            <el-button
              v-else
              type="info"
              size="default"
              @click="openNightDialog"
            >
              <el-icon style="margin-right: 6px;"><Moon /></el-icon>
              Ночь
            </el-button>
          </div>
        </div>
      </template>

      <GameTable :data="playersData" :row-class-name="getRowClassName">
        <el-table-column
          label="Фолы"
          width="80"
          align="center"
        >
          <template #default="{ row }">
            <div
              class="fouls-badge"
              :class="{
                'is-disabled': !row.is_in_game,
                'is-warning': getCurrentFouls(row) > 2
              }"
              @click="handleFoulsClick(row)"
            >
              {{ getCurrentFouls(row) }}
            </div>
          </template>
        </el-table-column>

        <RoleColumn :is-default-hidden="true" />

        <el-table-column
          label="Игрок"
          min-width="200"
        >
          <template #default="{ row }">
            {{ row.nickname }}
          </template>
        </el-table-column>

        <el-table-column
          label="Выставление"
          width="150"
          align="center"
        >
          <template #default="{ row }">
            <div v-if="votingCompleted || (phaseData.removed_box_ids && phaseData.removed_box_ids.length > 0)">
              <span
                v-if="phaseData.voted_box_ids.includes(row.box_id) || (phaseData.removed_box_ids && phaseData.removed_box_ids.includes(row.box_id))"
                class="left-game"
              >
                покинул игру
              </span>
              <span v-else>-</span>
            </div>
            <div v-else-if="row.is_in_game" class="nomination-cell">
              <el-button
                v-if="!isPlayerNominated(row.box_id)"
                type="warning"
                size="small"
                plain
                @click="addNomination(row.box_id)"
              >
                Выставить
              </el-button>
              <div v-else class="nomination-order">
                <span class="order-number">{{ getNominationOrder(row.box_id) }}</span>
                <el-icon
                  class="remove-icon"
                  @click="removeNomination(row.box_id)"
                  :size="16"
                >
                  <Close />
                </el-icon>
              </div>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </GameTable>
    </el-card>

    <VotingDialog
      v-model="votingDialogVisible"
      :nominated-players="nominatedPlayers"
      :players-data="playersData"
      :phase-data="phaseData"
      @update:phase-data="phaseData = $event"
      @update:nominated-players="nominatedPlayers = $event"
      @voting-completed="handleVotingCompleted"
    />

    <NightActionsDialog
      v-model="nightDialogVisible"
      :players-data="playersData"
      :phase-data="phaseData"
      :phase-id="displayPhase"
      @update:phase-data="phaseData = $event"
      @show-best-move="openBestMoveDialog"
      @next-round="handleNightActionDialog"
    />

    <BestMoveDialog
      v-model="bestMoveDialogVisible"
      :players-data="playersData"
      :phase-data="phaseData"
      @update:phase-data="phaseData = $event"
      @accept="handleNightActionDialog"
    />

    <PPKDialog
      v-model="ppkDialogVisible"
      :players-data="playersData"
      :phase-data="phaseData"
      @update:phase-data="phaseData = $event"
      @accept="handlePPKAccept"
    />

    <RemovePlayersDialog
      v-model="removePlayersDialogVisible"
      :players-data="playersData"
      :phase-data="phaseData"
      @update:phase-data="phaseData = $event"
      @accept="handleRemovePlayersAccept"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { User, Close, Moon } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import GameTable from './GameTable.vue'
import RoleColumn from './RoleColumn.vue'
import VotingDialog from './dialogs/VotingDialog.vue'
import NightActionsDialog from './dialogs/NightActionsDialog.vue'
import BestMoveDialog from './dialogs/BestMoveDialog.vue'
import PPKDialog from './dialogs/PPKDialog.vue'
import RemovePlayersDialog from './dialogs/RemovePlayersDialog.vue'
import { apiService } from '@/services/api.js'
import { GameRolesEnum } from '@/utils/constants.js'

const router = useRouter()

const props = defineProps({
  gameId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['round-completed'])

const playersData = ref([])
const phaseId = ref(null)
const gameStatus = ref(null)

// Массив для хранения box_id номинированных игроков в порядке выставления
const nominatedPlayers = ref([])

// Состояние модального окна голосования
const votingDialogVisible = ref(false)

// Состояние модального окна ночи
const nightDialogVisible = ref(false)

// Состояние модального окна лучшего хода
const bestMoveDialogVisible = ref(false)

// Состояние модального окна ППК
const ppkDialogVisible = ref(false)

// Состояние модального окна удаления игроков
const removePlayersDialogVisible = ref(false)

// Флаг завершения голосования
const votingCompleted = ref(false)

// Флаг для показа кнопки "Следующий круг"
const nextRoundButtonVisible = ref(false)

// Объект для формирования данных фазы игры
const phaseData = ref({
  don_checked_box_id: null,
  sheriff_checked_box_id: null,
  killed_box_id: null,
  removed_box_ids: [],
  voted_box_ids: [],
  ppk_box_id: null,
  fouls_summary: [],
  best_move: []
})

// Вычисляем отображаемую фазу дня
const displayPhase = computed(() => {
  if (phaseId.value === null) return null

  if (phaseId.value === 1 && gameStatus.value === 'roles_assigned') {
    return 1
  }

  if (gameStatus.value === 'in_progress') {
    return phaseId.value + 1
  }

  return phaseId.value
})

// Определяем, показывать ли кнопку "Начать голосование" или "Ночь"
const showVotingButton = computed(() => {
  // Если есть удаленные игроки, не показываем кнопку голосования
  if (phaseData.value.removed_box_ids && phaseData.value.removed_box_ids.length > 0) {
    return false
  }
  // Если phaseId == 1 и только один номинированный игрок - кнопка не показывается
  if (phaseId.value === 1 && nominatedPlayers.value.length === 1) {
    return false
  }
  return !votingCompleted.value && nominatedPlayers.value.length > 0
})

// Обработчик завершения голосования
const handleVotingCompleted = () => {
  votingCompleted.value = true
}

const getRowClassName = ({ row }) => {
  return !row.is_in_game ? 'inactive-player' : ''
}

// Проверяет, номинирован ли игрок
const isPlayerNominated = (boxId) => {
  return nominatedPlayers.value.includes(boxId)
}

// Возвращает порядковый номер номинации игрока
const getNominationOrder = (boxId) => {
  const index = nominatedPlayers.value.indexOf(boxId)
  return index !== -1 ? index + 1 : null
}

// Добавляет игрока в список номинированных
const addNomination = (boxId) => {
  if (!nominatedPlayers.value.includes(boxId)) {
    nominatedPlayers.value.push(boxId)
  }
}

// Удаляет игрока из списка номинированных
const removeNomination = (boxId) => {
  const index = nominatedPlayers.value.indexOf(boxId)
  if (index !== -1) {
    nominatedPlayers.value.splice(index, 1)
  }
}

// Открывает модальное окно голосования
const openVotingDialog = () => {
  // Если phaseId > 1 и только один номинированный игрок - автоматически завершаем голосование
  if (phaseId.value > 1 && nominatedPlayers.value.length === 1) {
    const votedPlayerId = nominatedPlayers.value[0]
    phaseData.value.voted_box_ids.push(votedPlayerId)
    votingCompleted.value = true
    return
  }
  votingDialogVisible.value = true
}

// Открывает модальное окно ночи
const openNightDialog = () => {
  nightDialogVisible.value = true
}

// Открывает модальное окно лучшего хода
const openBestMoveDialog = () => {
  nightDialogVisible.value = false
  bestMoveDialogVisible.value = true
}

// Открывает модальное окно ППК
const openPPKDialog = () => {
  ppkDialogVisible.value = true
}

// Открывает модальное окно удаления игроков
const openRemovePlayersDialog = () => {
  removePlayersDialogVisible.value = true
}

// Обработчик завершения ночи/лучшего хода (вызывается из диалогов)
const handleNightActionDialog = () => {
  console.log('Night action dialog completed', phaseData.value)
  // Показываем кнопку "Следующий круг"
  nextRoundButtonVisible.value = true
  // Никаких голосований перед ночью
  handleVotingCompleted()
}

// Обработчик принятия ППК
const handlePPKAccept = () => {
  console.log('PPK accepted', phaseData.value.ppk_box_id)
  handleNextRound()
}

// Обработчик принятия удаления игроков
const handleRemovePlayersAccept = () => {
  console.log('Players removed', phaseData.value.removed_box_ids)
}

// Обработчик клика по кнопке "Следующий круг"
const handleNextRound = async () => {
  try {
    // Отправляем данные фазы на сервер
    await apiService.createGamePhase(props.gameId, phaseData.value)

    // Эмитим событие для сброса таймера в родительском компоненте
    emit('round-completed')

    // Полная перезагрузка компонента
    await resetComponent()
  } catch (error) {
    console.error('Failed to save game phase:', error)
    ElMessage.error('Не удалось сохранить фазу игры')
  }
}

// Получает текущее количество фолов для игрока
const getCurrentFouls = (row) => {
  // Ищем фолы в phaseData.fouls_summary
  const foulEntry = phaseData.value.fouls_summary.find(f => f.box_id === row.box_id)
  if (foulEntry) {
    // Текущие фолы = исходные фолы + добавленные в этой фазе
    return (row.fouls || 0) + foulEntry.count_fouls
  }
  return row.fouls || 0
}

// Обработчик клика по бейджу фолов
const handleFoulsClick = (row) => {
  // Если игрок не в игре, ничего не делаем
  if (!row.is_in_game) return

  const currentFouls = getCurrentFouls(row)
  const initialFouls = row.fouls || 0

  // Вычисляем новое значение
  let newTotalFouls
  if (currentFouls === 4) {
    // Если 4, сбрасываем на исходное значение
    newTotalFouls = initialFouls
  } else {
    // Иначе увеличиваем до 4
    newTotalFouls = currentFouls + 1
  }

  // Вычисляем count_fouls для phaseData.fouls_summary
  const countFouls = newTotalFouls - initialFouls

  // Обновляем или добавляем запись в fouls_summary
  const existingIndex = phaseData.value.fouls_summary.findIndex(f => f.box_id === row.box_id)

  if (countFouls === 0) {
    // Если count_fouls равен 0, удаляем запись
    if (existingIndex !== -1) {
      phaseData.value.fouls_summary.splice(existingIndex, 1)
    }
  } else {
    const foulEntry = {
      box_id: row.box_id,
      count_fouls: countFouls
    }

    if (existingIndex !== -1) {
      // Обновляем существующую запись
      phaseData.value.fouls_summary[existingIndex] = foulEntry
    } else {
      // Добавляем новую запись
      phaseData.value.fouls_summary.push(foulEntry)
    }
  }

  // Если игрок получил 4 фола, добавляем его в removed_box_ids
  if (newTotalFouls === 4) {
    if (!phaseData.value.removed_box_ids.includes(row.box_id)) {
      phaseData.value.removed_box_ids.push(row.box_id)
    }
  } else {
    // Если фолов меньше 4, удаляем из removed_box_ids
    const removedIndex = phaseData.value.removed_box_ids.indexOf(row.box_id)
    if (removedIndex !== -1) {
      phaseData.value.removed_box_ids.splice(removedIndex, 1)
    }
  }
}

const loadGameData = async () => {
  try {
    const gameState = await apiService.getGameState(props.gameId)

    // Проверяем, завершена ли игра
    if (['mafia_win', 'civilians_win', 'draw'].includes(gameState.result)) {
      // Перенаправляем на страницу результатов
      router.push(`/game/${props.gameId}/results`)
      return
    }

    // Сохраняем phase_id и статус игры
    phaseId.value = gameState.phase_id
    gameStatus.value = gameState.result

    // Преобразуем данные игроков в формат для таблицы
    if (gameState.players && Array.isArray(gameState.players)) {
      playersData.value = gameState.players.map(player => ({
        id: player.id,
        nickname: player.nickname,
        box_id: player.box_id,
        role: player.role || GameRolesEnum.civilian,
        fouls: player.fouls || 0,
        is_in_game: player.is_in_game !== undefined ? player.is_in_game : true
      }))
    }
  } catch (error) {
    console.error('Failed to load game state:', error)
    playersData.value = []
  }
}

// Полная перезагрузка компонента
const resetComponent = async () => {
  // Сбрасываем все состояния к начальным значениям
  nominatedPlayers.value = []
  votingCompleted.value = false
  nextRoundButtonVisible.value = false

  // Сбрасываем phaseData
  phaseData.value = {
    don_checked_box_id: null,
    sheriff_checked_box_id: null,
    killed_box_id: null,
    removed_box_ids: [],
    voted_box_ids: [],
    ppk_box_id: null,
    fouls_summary: [],
    best_move: []
  }

  // Закрываем все диалоги
  votingDialogVisible.value = false
  nightDialogVisible.value = false
  bestMoveDialogVisible.value = false
  ppkDialogVisible.value = false
  removePlayersDialogVisible.value = false

  // Перезагружаем данные игры
  await loadGameData()
}

onMounted(() => {
  loadGameData()
})

// Экспортируем методы для вызова из родительского компонента
defineExpose({
  openPPKDialog,
  openRemovePlayersDialog
})
</script>

<style scoped>
.game-in-progress {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phase-indicator {
  margin-left: 8px;
  color: #909399;
  font-weight: normal;
}

.fouls-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background-color: #409eff;
  color: white;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;
}

.fouls-badge:hover:not(.is-disabled) {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.4);
}

.fouls-badge.is-warning {
  background-color: #e6a23c;
}

.fouls-badge.is-warning:hover {
  box-shadow: 0 2px 8px rgba(230, 162, 60, 0.4);
}

.fouls-badge.is-disabled {
  background-color: #dcdfe6;
  color: #909399;
  cursor: not-allowed;
}

:deep(.inactive-player) {
  opacity: 0.5;
  pointer-events: none;
}

:deep(.inactive-player td) {
  color: #909399 !important;
}

.nomination-cell {
  display: flex;
  justify-content: center;
  align-items: center;
}

.nomination-order {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background-color: #fdf6ec;
  border: 1px solid #e6a23c;
  border-radius: 4px;
  transition: all 0.3s;
}

.nomination-order:hover {
  background-color: #faecd8;
  border-color: #d89614;
}

.order-number {
  font-weight: 600;
  font-size: 16px;
  color: #e6a23c;
  min-width: 20px;
  text-align: center;
}

.remove-icon {
  cursor: pointer;
  color: #e6a23c;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-icon:hover {
  color: #cf7e0f;
  transform: scale(1.2);
}

.left-game {
  font-size: 13px;
  color: #d89614;
  font-style: italic;
  font-weight: 500;
}
</style>
