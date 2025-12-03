<template>
  <div class="game-in-progress">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><User /></el-icon>
            <span>Игра в процессе</span>
            <span v-if="phaseId !== null" class="phase-indicator">День {{ phaseId }}</span>
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
            <div class="fouls-badge" :class="{ 'is-disabled': !row.is_in_game }">
              {{ row.fouls || 0 }}
            </div>
          </template>
        </el-table-column>

        <el-table-column
          width="90"
          align="left"
        >
          <template #header>
            <div class="role-header">
              <span>Роль</span>
              <el-tooltip :content="rolesVisible ? 'Скрыть роли' : 'Отобразить роли'" placement="top">
                <el-icon
                  class="eye-icon"
                  @click="toggleRolesVisibility"
                  style="cursor: pointer; margin-left: 4px;"
                >
                  <View v-if="rolesVisible" />
                  <Hide v-else />
                </el-icon>
              </el-tooltip>
            </div>
          </template>
          <template #default="{ row }">
            <div v-if="rolesVisible">
              <CitizenIcon v-if="row.role === GameRolesEnum.civilian" />
              <SheriffIcon v-else-if="row.role === GameRolesEnum.sheriff" />
              <DonIcon v-else-if="row.role === GameRolesEnum.don" />
              <MafiaIcon v-else-if="row.role === GameRolesEnum.mafia" />
            </div>
            <div v-else>
              <el-icon :size="24" style="color: #909399;">
                <Hide />
              </el-icon>
            </div>
          </template>
        </el-table-column>

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
            <div v-if="row.is_in_game" class="nomination-cell">
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { User, View, Hide, Close } from '@element-plus/icons-vue'
import GameTable from './GameTable.vue'
import CitizenIcon from './icons/CitizenIcon.vue'
import SheriffIcon from './icons/SheriffIcon.vue'
import DonIcon from './icons/DonIcon.vue'
import MafiaIcon from './icons/MafiaIcon.vue'
import { apiService } from '@/services/api.js'
import { GameRolesEnum } from '@/utils/constants.js'

const props = defineProps({
  gameId: {
    type: String,
    required: true
  }
})

const playersData = ref([])
const rolesVisible = ref(true)
const phaseId = ref(null)

// Массив для хранения box_id номинированных игроков в порядке выставления
const nominatedPlayers = ref([])

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

const toggleRolesVisibility = () => {
  rolesVisible.value = !rolesVisible.value
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

const loadGameData = async () => {
  try {
    const gameState = await apiService.getGameState(props.gameId)

    // Сохраняем phase_id
    phaseId.value = gameState.phase_id

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

onMounted(() => {
  loadGameData()
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

.role-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.eye-icon {
  transition: color 0.3s;
}

.eye-icon:hover {
  color: #409eff;
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
}

.fouls-badge.is-disabled {
  background-color: #dcdfe6;
  color: #909399;
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
</style>
