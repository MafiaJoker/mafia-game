<template>
  <div class="game-view" :class="{ 'is-mobile': isMobile }">
    <el-container v-loading="loading">
      <el-header>
        <div class="header-content">
          <el-button
            v-if="isMobile"
            :icon="ArrowLeft"
            circle
            aria-label="Назад"
            @click="$router.back()"
          />
          <el-button
            v-else
            @click="$router.back()"
            :icon="ArrowLeft"
          >
            Назад
          </el-button>
          <div class="header-title-section">
            <h1>{{ gameData?.label || 'Игра' }}</h1>
            <GameTimer v-if="showTimer" />
          </div>
          <div class="header-actions">
            <el-tag type="info">{{ getStatusLabel(gameData?.result) }}</el-tag>
          </div>
        </div>
      </el-header>

      <el-main>
        <el-card>
          <!-- Фаза: Рассадка игроков -->
          <SeatingPlayers
            v-if="currentPhaseTemplate === 'SeatingPlayers'"
            :game-id="props.id"
            :event-id="gameData?.event.id"
            @seating-complete="loadGame"
          />

          <!-- Фаза: Распределение ролей -->
          <RolesAssigne
            v-if="currentPhaseTemplate === 'RolesAssigne'"
            :game-id="props.id"
            v-model:roles-data="rolesData"
            :is-free-seat-phase="isFreeSeatPhase"
            @negotiation-started="isNegotiationStarted = true"
            @game-started="handleGameStarted"
          />

          <!-- Фаза: Игра в процессе -->
          <GameInProgress
              v-if="currentPhaseTemplate === 'GameInProgress'"
              ref="gameInProgressRef"
              :game-id="props.id"
              @round-completed="handleRoundCompleted"
          />
        </el-card>

        <!-- Дополнительные кнопки для фазы игры.
             На телефоне они в нижней панели самой игры -->
        <div v-if="currentPhaseTemplate === 'GameInProgress' && !isMobile" class="additional-actions">
          <el-button type="warning" size="large" @click="handlePPKClick">
            ППК
          </el-button>
          <el-button type="danger" size="large" @click="handleRemovePlayersClick">
            Удалить игроков
          </el-button>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/services/api.js'
import { COUNTDOWN_PHASES } from '@/utils/constants.js'
import { FINISHED_GAME_RESULTS } from '@/utils/gameConstants.js'
import { useBreakpoints } from '@/composables/useBreakpoints'
import { useGameTimer } from '@/composables/useGameTimer'
import SeatingPlayers from '@/components/game/SeatingPlayers.vue'
import RolesAssigne from '@/components/game/RolesAssigne.vue'
import GameInProgress from '@/components/game/GameInProgress.vue'
import GameTimer from '@/components/game/GameTimer.vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

const router = useRouter()
const { isMobile } = useBreakpoints()
const timer = useGameTimer()
const loading = ref(false)
const gameData = ref(null)
const isNegotiationStarted = ref(false)
const isFreeSeatPhase = ref(false)
const rolesData = ref([])
const gameStartedEventEmitted = ref(false)
const gameInProgressRef = ref(null)

const currentPhaseTemplate = computed(() => {
  // Если событие game-started было заэмичено, показываем игру
  if (gameStartedEventEmitted.value) {
    return 'GameInProgress'
  }

  // Выбор шаблона на основе статуса игры
  switch (gameData.value?.result) {
    case 'in_progress':
    case 'roles_assigned':
      return 'GameInProgress'

    case 'seating_ready':
      return 'RolesAssigne'

    case 'created':
      return 'SeatingPlayers'

    default:
      return null
  }
})

const showTimer = computed(() =>
  currentPhaseTemplate.value === 'GameInProgress' || isNegotiationStarted.value
)

// Договорка началась - таймер уходит в обратный отсчет 60+40,
// вернулись к раздаче ролей - в прямой
watch(isNegotiationStarted, (started) => {
  if (started) {
    timer.startCountdown()
  } else {
    timer.resetToCountUp()
  }
})

watch(timer.countdownPhase, (phase) => {
  if (phase === COUNTDOWN_PHASES.FREE_SEATING) {
    isFreeSeatPhase.value = true
  }
})

const handleGameStarted = () => {
  gameStartedEventEmitted.value = true
  // Договорка кончилась - таймер уходит в прямой отсчет
  isNegotiationStarted.value = false
}

const handleRoundCompleted = () => {
  // Новый круг - таймер с нуля
  timer.reset()
}

const getStatusLabel = (status) => {
  const labels = {
    'created': 'Рассадка игроков',
    'seating_ready': 'Распределение ролей',
    'roles_assigned': 'Предигра',
    'in_progress': 'Игра идет',
    'mafia_win': 'Победа мафии',
    'civilians_win': 'Победа мирных',
    'draw': 'Ничья'
  }
  return labels[status] || status
}

const handlePPKClick = () => {
  if (gameInProgressRef.value) {
    gameInProgressRef.value.openPPKDialog()
  }
}

const handleRemovePlayersClick = () => {
  if (gameInProgressRef.value) {
    gameInProgressRef.value.openRemovePlayersDialog()
  }
}

const loadGame = async () => {
  loading.value = true
  try {
    gameData.value = await apiService.getGame(props.id)

    // Формируем rolesData для компонента RolesAssigne
    if (gameData.value.players && Array.isArray(gameData.value.players)) {
      rolesData.value = gameData.value.players.map(player => ({
        id: player.id,
        nickname: player.nickname,
        box_id: player.box_id,
        role: player.role || 'civilian'
      }))
    }

    // Если игра завершена, перенаправляем на страницу результатов.
    // replace, а не push: иначе «Назад» возвращает на страницу игры,
    // а она снова уводит на результаты - выйти к мероприятию нечем
    if (FINISHED_GAME_RESULTS.includes(gameData.value.result)) {
      router.replace(`/game/${props.id}/results`)
    }
  } catch (error) {
    console.error('Failed to load game:', error)
    ElMessage.error('Не удалось загрузить данные игры')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Состояние таймера общее на всё приложение и переживает уход со страницы -
  // новую игру начинаем с нуля
  timer.reset()
  timer.activate()
  loadGame()
})

onUnmounted(() => {
  timer.deactivate()
})
</script>

<style scoped>
.game-view {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  width: 100%;
}

.header-title-section {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
  justify-content: center;
}

.header-title-section h1 {
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.additional-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 16px;
  padding: 0 20px 20px;
}

/* Планшет и телефон */
@media (max-width: 1023px) {
  .game-view {
    min-height: auto;
  }

  .header-content {
    flex-wrap: wrap;
    gap: 8px 12px;
  }

  .header-title-section {
    gap: 12px;
  }

  .header-title-section h1 {
    font-size: 1.25rem;
  }
}

/* Телефон: строка «назад - название - статус», под ней таймер во всю ширину.
   Шапка прилипает к верху: таймер судье нужен всегда, а список игроков длинный */
@media (max-width: 767px) {
  .game-view :deep(.el-header) {
    position: sticky;
    top: 0;
    z-index: 30;
    background-color: #f5f7fa;
    border-bottom: 1px solid #e4e7ed;
    padding: 8px 12px;
  }

  .header-content {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
  }

  .header-title-section {
    display: contents;
  }

  .header-title-section h1 {
    font-size: 1.05rem;
    line-height: 1.3;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .header-title-section :deep(.game-timer) {
    grid-column: 1 / -1;
  }

  .header-actions {
    gap: 0;
  }

  .header-actions :deep(.el-tag) {
    max-width: 38vw;
  }

  .header-actions :deep(.el-tag__content) {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Внешняя карточка лишняя: у каждой фазы игры есть своя, а двойная рамка
     съедает 26px ширины у списка игроков */
  .game-view :deep(.el-main > .el-card) {
    border: none;
    box-shadow: none;
    background: transparent;
  }

  .game-view :deep(.el-main > .el-card > .el-card__body) {
    padding: 0;
  }

  .game-view :deep(.el-main) {
    padding: 8px;
  }
}
</style>
