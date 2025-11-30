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
            v-if="gameData?.result === 'created'"
            :game-id="props.id"
            @seating-complete="loadGame"
          />

          <!-- Фаза: Распределение ролей -->
          <RolesAssigne
            v-if="gameData?.result === 'seating_ready' || gameData?.result === 'roles_assigned'"
            :game-id="props.id"
            @negotiation-started="showTimer = true"
            @negotiation-ended="showTimer = false"
          />

          <!-- Фаза: Игра в процессе -->
          <GameInProgress v-if="gameData?.result === 'in_progress'" />
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
