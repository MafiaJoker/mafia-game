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
            v-if="gameData?.result === 'created'"
            :game-id="props.id"
            @seating-complete="loadGame"
          />

          <!-- Фаза: Распределение ролей -->
          <RolesAssigne
            v-if="gameData?.result === 'seating_ready'"
            :game-id="props.id"
            :is-free-seat-phase="isFreeSeatPhase"
            @negotiation-started="showTimer = true; isNegotiationStarted = true"
            @negotiation-ended="showTimer = false; isNegotiationStarted = false; isFreeSeatPhase = false"
            @game-started="loadGame"
          />

          <!-- Фаза: Игра в процессе -->
          <GameInProgress v-if="gameData?.result === 'in_progress' || gameData?.result === 'roles_assigned'" />
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
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

const handlePhaseChanged = (phase) => {
  if (phase === COUNTDOWN_PHASES.FREE_SEATING) {
    isFreeSeatPhase.value = true
  }
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

const loadGame = async () => {
  loading.value = true
  try {
    gameData.value = await apiService.getGame(props.id)

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
</style>
