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
              v-if="nextRoundButtonVisible || gameFinished"
              type="primary"
              size="default"
              @click="handleNextRound"
            >
              {{ gameFinished ? 'Завершить игру' : 'Следующий круг' }}
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
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <FoulBadges
              :game-id="gameId"
              :player="row"
              :foul-types="foulTypes"
              @saved="applyGameState"
            />
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
            <div v-if="votingCompleted || removedThisPhase">
              <span
                v-if="phaseData.voted_box_ids.includes(row.box_id) || phaseData.removed_box_ids.includes(row.box_id) || leftByFouls(row)"
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
                  :size="14"
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
      :game-id="gameId"
      :nominated-players="nominatedPlayers"
      :players-data="playersData"
      :phase-data="phaseData"
      :foul-types="foulTypes"
      @update:phase-data="phaseData = $event"
      @update:nominated-players="nominatedPlayers = $event"
      @voting-completed="handleVotingCompleted"
      @fouls-saved="applyGameState"
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
import FoulBadges from './FoulBadges.vue'
import VotingDialog from './dialogs/VotingDialog.vue'
import NightActionsDialog from './dialogs/NightActionsDialog.vue'
import BestMoveDialog from './dialogs/BestMoveDialog.vue'
import PPKDialog from './dialogs/PPKDialog.vue'
import RemovePlayersDialog from './dialogs/RemovePlayersDialog.vue'
import { apiService } from '@/services/api.js'
import { GameRolesEnum } from '@/utils/constants.js'
import { FINISHED_GAME_RESULTS } from '@/utils/gameConstants.js'
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

// Типы фолов системы правил игры: [{ foul_type, removal_threshold }]
const foulTypes = ref([{ foul_type: 'regular', removal_threshold: 4 }])

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

// Игра уже завершена по данным сервера — кнопка превращается в «Завершить игру»
const gameFinished = ref(false)

// Объект для формирования данных фазы игры
const phaseData = ref({
  don_checked_box_id: null,
  sheriff_checked_box_id: null,
  killed_box_id: null,
  removed_box_ids: [],
  voted_box_ids: [],
  ppk_box_id: null,
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

// Игрок выбыл по фолам в текущем круге: в снимке начала круга был в игре,
// а после перечитывания состояния с сервера — уже нет
const leftByFouls = (row) => row.was_in_game && !row.is_in_game

// Есть ли выбывшие в текущем круге (ручное удаление или удаление по фолам)
const removedThisPhase = computed(() => {
  return phaseData.value.removed_box_ids.length > 0 || playersData.value.some(leftByFouls)
})

// Определяем, показывать ли кнопку "Начать голосование" или "Ночь"
const showVotingButton = computed(() => {
  // Если есть удаленные игроки, не показываем кнопку голосования
  if (removedThisPhase.value) {
    return false
  }
  // Если phaseId == 1 и только один номинированный игрок - кнопка не показывается
  if (phaseId.value === 1 && nominatedPlayers.value.length === 1 && gameStatus.value === 'roles_assigned') {
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
const addNomination = async (boxId) => {
  if (!nominatedPlayers.value.includes(boxId)) {
    nominatedPlayers.value.push(boxId)
    try {
      await apiService.patchGamePhase(props.gameId, {
        nominated_box_ids: [...nominatedPlayers.value]
      })
    } catch (error) {
      console.error('Failed to patch nominated_box_ids:', error)
    }
  }
}

// Удаляет игрока из списка номинированных
const removeNomination = async (boxId) => {
  const index = nominatedPlayers.value.indexOf(boxId)
  if (index !== -1) {
    nominatedPlayers.value.splice(index, 1)
    try {
      await apiService.patchGamePhase(props.gameId, {
        nominated_box_ids: [...nominatedPlayers.value]
      })
    } catch (error) {
      console.error('Failed to patch nominated_box_ids:', error)
    }
  }
}

// Открывает модальное окно голосования
const openVotingDialog = () => {
  // in_progress означается любую фазу от 1 и выше когда нам нужно голосовать сразу
  if (gameStatus.value === 'in_progress' && nominatedPlayers.value.length === 1 ) {
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
const handleNightActionDialog = async () => {
  console.log('Night action dialog completed', phaseData.value)
  // Показываем кнопку "Следующий круг"
  nextRoundButtonVisible.value = true
  // Никаких голосований перед ночью
  handleVotingCompleted()

  // Синхронизируем данные круга и узнаём у сервера, не завершилась ли игра:
  // данные голосования/ночи живут только в phaseData до этого PATCH
  try {
    await apiService.patchGamePhase(props.gameId, phaseData.value)
    const gameState = await apiService.getGameState(props.gameId)
    gameFinished.value = FINISHED_GAME_RESULTS.includes(gameState.result)
  } catch (error) {
    console.error('Failed to check game state after round:', error)
    gameFinished.value = false
  }
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
    // Обновляем данные фазы на сервере: PATCH меняет только переданные поля
    // и не трогает фолы, разложенные по кругам сервером
    await apiService.patchGamePhase(props.gameId, phaseData.value)

    // Игра могла завершиться раньше или по итогам этого круга —
    // проверяем результат до создания новой фазы
    const gameState = await apiService.getGameState(props.gameId)
    if (FINISHED_GAME_RESULTS.includes(gameState.result)) {
      router.push(`/game/${props.gameId}/results`)
      return
    }

    // Создаем новую пустую фазу для следующего круга
    await apiService.createGamePhase(props.gameId, {})

    // Эмитим событие для сброса таймера в родительском компоненте
    emit('round-completed')

    // Полная перезагрузка компонента
    await resetComponent()
  } catch (error) {
    console.error('Failed to save game phase:', error)
    ElMessage.error('Не удалось сохранить фазу игры')
  }
}

// Фолы и удаление за них считает сервер: ручка фолов возвращает состояние
// игры целиком, поэтому просто применяем его к таблице
const applyGameState = (gameState) => {
  // Ручка могла ответить не состоянием игры (пустое тело, ошибка шлюза):
  // перечитываем состояние с сервера, иначе таблица молча разойдётся с ним
  if (!Array.isArray(gameState?.players)) {
    console.error('Unexpected game state in fouls response:', gameState)
    loadGameData()
    return
  }

  const playersByBox = new Map(gameState.players.map(p => [p.box_id, p]))
  playersData.value.forEach(player => {
    const statePlayer = playersByBox.get(player.box_id)
    if (!statePlayer) return
    // Возвращённый в игру откатом фола снова участвует в текущем круге:
    // его повторное удаление должно опять считаться выбытием в этом круге
    player.was_in_game = player.was_in_game || statePlayer.is_in_game
    player.is_in_game = statePlayer.is_in_game
    player.fouls = statePlayer.fouls || []
  })

  // Удаление по фолам могло завершить игру (или откат фола — «раззавершить»)
  gameFinished.value = FINISHED_GAME_RESULTS.includes(gameState.result)
}

const loadGameData = async () => {
  try {
    const gameState = await apiService.getGameState(props.gameId)

    // Проверяем, завершена ли игра
    if (FINISHED_GAME_RESULTS.includes(gameState.result)) {
      // Перенаправляем на страницу результатов
      router.push(`/game/${props.gameId}/results`)
      return
    }

    // Сохраняем phase_id и статус игры
    phaseId.value = gameState.phase_id
    gameStatus.value = gameState.result

    // Типы фолов и пороги удаления — из системы правил игры
    if (gameState.rule_system?.removal_thresholds?.length) {
      foulTypes.value = gameState.rule_system.removal_thresholds
    }

    // Преобразуем данные игроков в формат для таблицы
    if (gameState.players && Array.isArray(gameState.players)) {
      playersData.value = gameState.players.map(player => {
        const isInGame = player.is_in_game !== undefined ? player.is_in_game : true
        return {
          id: player.id,
          nickname: player.nickname,
          box_id: player.box_id,
          role: player.role || GameRolesEnum.civilian,
          // Фолы по типам за всю игру: [{ type, count }]
          fouls: player.fouls || [],
          is_in_game: isInGame,
          // Снимок для определения выбывших в текущем круге
          was_in_game: isInGame
        }
      })
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
  gameFinished.value = false

  // Сбрасываем phaseData
  phaseData.value = {
    don_checked_box_id: null,
    sheriff_checked_box_id: null,
    killed_box_id: null,
    removed_box_ids: [],
    voted_box_ids: [],
    ppk_box_id: null,
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

onMounted(async () => {
  await loadGameData()
  // Создаем пустую фазу при открытии страницы
  try {
    await apiService.createGamePhase(props.gameId, {})
  } catch (error) {
    console.error('Failed to create empty phase:', error)
  }
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

:deep(.el-table .el-table__row) {
  height: 48px;
}

:deep(.el-table .el-table__cell) {
  padding: 6px 0;
}

:deep(.inactive-player) {
  opacity: 0.5;
  pointer-events: none;
}

/* Бейджи фолов кликабельны и у выбывшего — для отката фолов текущей фазы */
:deep(.inactive-player .foul-badges) {
  pointer-events: auto;
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
  gap: 4px;
  padding: 2px 8px;
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
  font-size: 14px;
  color: #e6a23c;
  min-width: 16px;
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
