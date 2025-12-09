<template>
  <div class="game-view">
    <el-container v-loading="loading">
      <el-header>
        <div class="header-content">
          <el-button
            @click="$router.back()"
            :icon="ArrowLeft"
          >
            Назад
          </el-button>
          <div class="header-title-section">
            <h1>{{ gameData?.label || 'Игра' }}</h1>
            <GameTimer
              v-if="showTimer"
              :key="timerReset"
              :is-negotiation-started="isNegotiationStarted"
              @phase-changed="handlePhaseChanged"
            />
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
            @negotiation-started="showTimer = true; isNegotiationStarted = true"
            @negotiation-ended="showTimer = false; isNegotiationStarted = false; isFreeSeatPhase = false"
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

        <!-- Дополнительные кнопки для фазы игры -->
        <div v-if="currentPhaseTemplate === 'GameInProgress'" class="additional-actions">
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/services/api.js'
import { COUNTDOWN_PHASES } from '@/utils/constants.js'
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
const loading = ref(false)
const gameData = ref(null)
const showTimer = ref(false)
const isNegotiationStarted = ref(false)
const isFreeSeatPhase = ref(false)
const rolesData = ref([])
const gameStartedEventEmitted = ref(false)
const gameInProgressRef = ref(null)
const timerReset = ref(0) // Счетчик для сброса таймера

const currentPhaseTemplate = computed(() => {
  // Если событие game-started было заэмичено, показываем игру
  if (gameStartedEventEmitted.value) {
    showTimer.value = true
    isNegotiationStarted.value = false
    return 'GameInProgress'
  }

  // Выбор шаблона на основе статуса игры
  switch (gameData.value?.result) {
    case 'in_progress':
    case 'roles_assigned':
      showTimer.value = true
      isNegotiationStarted.value = false
      return 'GameInProgress'

    case 'seating_ready':
      return 'RolesAssigne'

    case 'created':
      return 'SeatingPlayers'

    default:
      return null
  }
})

const handlePhaseChanged = (phase) => {
  if (phase === COUNTDOWN_PHASES.FREE_SEATING) {
    isFreeSeatPhase.value = true
  }
}

const handleGameStarted = () => {
  gameStartedEventEmitted.value = true
}

const handleRoundCompleted = () => {
  // Увеличиваем счетчик для сброса таймера
  timerReset.value++
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

    // Если игра завершена, перенаправляем на страницу результатов
    if (['mafia_win', 'civilians_win', 'draw'].includes(gameData.value.result)) {
      router.push(`/game/${props.id}/results`)
    }
  } catch (error) {
    console.error('Failed to load game:', error)
    ElMessage.error('Не удалось загрузить данные игры')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadGame()
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

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    padding: 16px 0;
  }

  .header-content h1 {
    margin: 0;
  }
}

.additional-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 16px;
  padding: 0 20px 20px;
}
</style>
