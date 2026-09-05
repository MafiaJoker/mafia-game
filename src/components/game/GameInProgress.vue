<template>
  <div class="game-in-progress" :class="{ 'is-mobile': isMobile }">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><User /></el-icon>
            <span>Игра в процессе</span>
            <span v-if="displayPhase !== null" class="phase-indicator">День {{ displayPhase }}</span>
          </div>
          <!-- На телефоне кнопка фазы живёт в панели у нижнего края экрана -->
          <div v-if="!isMobile" class="header-right">
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

      <!-- Телефон: таблица на пять колонок в 360px не помещается - список строк,
           где номер, роль, ник, фолы и выставление стоят в одну линию -->
      <div v-if="isMobile" class="players-list">
        <div class="players-list-header">
          <span class="col-number">№</span>
          <span class="col-role">
            <el-icon
              class="eye-icon"
              :title="mobileRolesVisible ? 'Скрыть роли' : 'Отобразить роли'"
              @click="mobileRolesVisible = !mobileRolesVisible"
            >
              <View v-if="mobileRolesVisible" />
              <Hide v-else />
            </el-icon>
          </span>
          <span class="col-name">Игрок</span>
          <span class="col-fouls">Фолы</span>
          <span class="col-nomination">Выст.</span>
        </div>

        <div
          v-for="row in playersData"
          :key="row.box_id"
          class="player-row"
          :class="{ 'inactive-player': !row.is_in_game }"
        >
          <span class="col-number">{{ row.box_id }}</span>
          <span class="col-role">
            <RoleIcon v-if="mobileRolesVisible" :role="row.role" />
            <el-icon v-else :size="18" style="color: #909399;"><Hide /></el-icon>
          </span>
          <span class="col-name">{{ row.nickname }}</span>
          <span class="col-fouls">
            <FoulBadges
              :game-id="gameId"
              :player="row"
              :foul-types="foulTypes"
              :pending-fouls="pendingFouls"
              @saved="applyGameState"
            />
          </span>
          <span class="col-nomination">
            <template v-if="votingCompleted || removedThisPhase">
              <span
                v-if="leftThisPhase(row)"
                class="left-game"
              >
                выбыл
              </span>
              <span v-else>-</span>
            </template>
            <template v-else-if="row.is_in_game">
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
            </template>
            <span v-else>-</span>
          </span>
        </div>
      </div>

      <GameTable v-else :data="playersData" :row-class-name="getRowClassName">
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
              :pending-fouls="pendingFouls"
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
                v-if="leftThisPhase(row)"
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

    <!-- Телефон: действия судьи прибиты к нижнему краю - до них не надо
         прокручивать список из десяти игроков -->
    <div v-if="isMobile" class="mobile-action-bar">
      <el-button type="warning" class="bar-secondary" @click="openPPKDialog">
        ППК
      </el-button>
      <el-button
        type="danger"
        class="bar-secondary"
        :icon="Delete"
        aria-label="Удалить игроков"
        title="Удалить игроков"
        @click="openRemovePlayersDialog"
      />
      <el-button
        v-if="nextRoundButtonVisible || gameFinished"
        type="primary"
        class="bar-primary"
        @click="handleNextRound"
      >
        {{ gameFinished ? 'Завершить игру' : 'Следующий круг' }}
      </el-button>
      <el-button
        v-else-if="showVotingButton"
        type="primary"
        class="bar-primary"
        @click="openVotingDialog"
      >
        Голосование
      </el-button>
      <el-button
        v-else
        type="info"
        class="bar-primary"
        @click="openNightDialog"
      >
        <el-icon style="margin-right: 6px;"><Moon /></el-icon>
        Ночь
      </el-button>
    </div>

    <VotingDialog
      v-model="votingDialogVisible"
      :game-id="gameId"
      :nominated-players="nominatedPlayers"
      :players-data="playersData"
      :phase-data="phaseData"
      :foul-types="foulTypes"
      :pending-fouls="pendingFouls"
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
import { User, Close, Moon, View, Hide, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import GameTable from './GameTable.vue'
import { createPendingFouls } from '@/utils/pendingFouls.js'
import RoleColumn from './RoleColumn.vue'
import RoleIcon from './RoleIcon.vue'
import FoulBadges from './FoulBadges.vue'
import VotingDialog from './dialogs/VotingDialog.vue'
import NightActionsDialog from './dialogs/NightActionsDialog.vue'
import BestMoveDialog from './dialogs/BestMoveDialog.vue'
import PPKDialog from './dialogs/PPKDialog.vue'
import RemovePlayersDialog from './dialogs/RemovePlayersDialog.vue'
import { apiService } from '@/services/api.js'
import { GameRolesEnum } from '@/utils/constants.js'
import { FINISHED_GAME_RESULTS } from '@/utils/gameConstants.js'
import { useBreakpoints } from '@/composables/useBreakpoints'
const router = useRouter()

const props = defineProps({
  gameId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['round-completed'])

const { isMobile } = useBreakpoints()

// Роли в списке телефона спрятаны, как и в колонке таблицы: игроки сидят рядом
const mobileRolesVisible = ref(false)

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

// Отправленные, но не подтверждённые сервером фолы — общие для бейджей
// таблицы и панели фолов диалога голосования: одного игрока рендерят оба
const pendingFouls = createPendingFouls()

// Объект для формирования данных фазы игры
const phaseData = ref({
  don_checked_box_id: null,
  sheriff_checked_box_id: null,
  killed_box_id: null,
  removed_box_ids: [],
  night_removed_box_ids: [],
  voted_box_ids: [],
  ppk_box_id: null,
  best_move: []
})

// PATCH затирает всё, что пришло в теле, а после перезагрузки страницы
// phaseData пуст при уже сохранённом круге. Поэтому отправляем только
// заполненное: отсутствие поля означает «не трогай», а не «обнули».
// Обратная сторона — переигранный после перезагрузки круг не умеет снимать
// отстрел: круг не читается с сервера (MafiaJoker/backend#183)
const savePhaseData = async () => {
  const filled = Object.fromEntries(
    Object.entries(phaseData.value).filter(([, value]) => (
      Array.isArray(value) ? value.length > 0 : value !== null
    ))
  )

  // Круг, в котором ничего не произошло: сохранять нечего
  if (Object.keys(filled).length === 0) return

  await apiService.patchGamePhase(props.gameId, filled)
}

// Номер дня — это номер круга с сервера: фазу текущего круга создаёт
// «Следующий круг», а не открытие страницы, поэтому прибавлять к ней нечего
const displayPhase = computed(() => phaseId.value)

// Игрок выбыл по фолам в текущем круге: в снимке начала круга был в игре,
// а после перечитывания состояния с сервера — уже нет
const leftByFouls = (row) => row.was_in_game && !row.is_in_game

// Игрок выбыл в текущем круге: голосование, удаление днём или ночью, фолы.
// Отстрел сюда не входит: ночь ничего не рассказывает столу
const leftThisPhase = (row) => (
  phaseData.value.voted_box_ids.includes(row.box_id)
  || phaseData.value.removed_box_ids.includes(row.box_id)
  || phaseData.value.night_removed_box_ids.includes(row.box_id)
  || leftByFouls(row)
)

// Есть ли выбывшие ДНЁМ в текущем круге (ручное удаление или удаление по
// фолам). Ночное удаление сюда не идёт: этот флаг решает, показывать ли
// кнопку голосования, а ночь наступает уже после него
const removedThisPhase = computed(() => {
  return phaseData.value.removed_box_ids.length > 0 || playersData.value.some(leftByFouls)
})

// Определяем, показывать ли кнопку "Начать голосование" или "Ночь"
const showVotingButton = computed(() => {
  // Если есть удаленные игроки, не показываем кнопку голосования
  if (removedThisPhase.value) {
    return false
  }
  // Первый день с единственным выставленным: по правилам голосования нет.
  // Круг считаем по phase_id — статус после перезагрузки уже in_progress
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
  // Со второго дня единственный выставленный уходит без голосования.
  // Статус тут не годится: после перезагрузки он in_progress и в первом дне
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
const handleNightActionDialog = async () => {
  console.log('Night action dialog completed', phaseData.value)
  // Показываем кнопку "Следующий круг"
  nextRoundButtonVisible.value = true
  // Никаких голосований перед ночью
  handleVotingCompleted()

  // Синхронизируем данные круга и узнаём у сервера, не завершилась ли игра:
  // данные голосования/ночи живут только в phaseData до этого PATCH
  try {
    await savePhaseData()
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
    await savePhaseData()

    // Игра могла завершиться раньше или по итогам этого круга —
    // проверяем результат до создания новой фазы
    const gameState = await apiService.getGameState(props.gameId)
    if (FINISHED_GAME_RESULTS.includes(gameState.result)) {
      // replace: ведение завершённой игры - не то место, куда возвращает «Назад»
      router.replace(`/game/${props.gameId}/results`)
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
      // Перенаправляем на страницу результатов, не оставляя записи в истории
      router.replace(`/game/${props.gameId}/results`)
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
  pendingFouls.clear()
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
    night_removed_box_ids: [],
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
  // Первый круг создаём только на старте игры: сервер отдаёт roles_assigned
  // ровно тогда, когда фаз ещё нет (app/game/models.py: get_game_result).
  // Иначе каждое открытие страницы дописывает игре пустой круг, а три пустых
  // круга подряд — это ничья
  if (gameStatus.value !== 'roles_assigned') return

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

/* Планшет: ряды таблицы выше, бейджи и кнопки крупнее - под палец */
@media (min-width: 768px) and (max-width: 1023px) {
  :deep(.el-table .el-table__row) {
    height: 56px;
  }
}

/* ---------- Телефон ---------- */

/* Место под прибитую снизу панель действий */
.game-in-progress.is-mobile {
  padding-bottom: 76px;
}

.players-list {
  margin: 0 -12px;
}

.players-list-header,
.player-row {
  display: grid;
  grid-template-columns: 24px 30px minmax(0, 1fr) auto 80px;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
}

.players-list-header {
  height: 36px;
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  border-bottom: 1px solid #ebeef5;
}

.players-list-header .col-nomination {
  text-align: center;
}

.player-row {
  min-height: 56px;
  border-bottom: 1px solid #f0f2f5;
}

.player-row:nth-child(odd) {
  background-color: #fafafa;
}

.player-row.inactive-player {
  opacity: 0.5;
}

.player-row.inactive-player .col-name,
.player-row.inactive-player .col-number {
  color: #909399;
}

.player-row.inactive-player .col-nomination {
  pointer-events: none;
}

.col-number {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
}

.col-role {
  display: flex;
  align-items: center;
  justify-content: center;
}

.col-role .eye-icon {
  font-size: 18px;
  color: #909399;
  cursor: pointer;
  padding: 6px;
  margin: -6px;
}

.col-name {
  font-size: 15px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-fouls {
  display: flex;
  justify-content: center;
}

.col-nomination {
  display: flex;
  justify-content: center;
  align-items: center;
}

.col-nomination .el-button {
  width: 100%;
  padding-left: 4px;
  padding-right: 4px;
  font-size: 12px;
}

.col-nomination .nomination-order {
  padding: 6px 10px;
}

.mobile-action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  background-color: #fff;
  border-top: 1px solid #e4e7ed;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
}

.mobile-action-bar .el-button {
  margin-left: 0;
  height: 44px;
  font-size: 15px;
}

.mobile-action-bar .bar-secondary {
  flex: 0 0 auto;
  min-width: 56px;
}

.mobile-action-bar .bar-primary {
  flex: 1;
}
</style>
