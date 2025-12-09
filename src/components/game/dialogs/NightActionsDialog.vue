<template>
  <el-dialog
    v-model="visible"
    title="Ночь"
    width="800px"
  >
    <div class="night-container">
      <!-- Отстрел мафии -->
      <div class="action-row">
        <div class="action-label">
          <span>Отстрел мафии</span>
        </div>
        <div class="action-buttons">
          <el-button
            v-for="player in activePlayers"
            :key="player.box_id"
            size="small"
            @click="setKilledPlayer(player.box_id)"
            class="action-btn"
          >
            {{ player.box_id }}
          </el-button>
          <el-button
            type="danger"
            size="small"
            plain
            @click="setKilledPlayer(null)"
            class="action-btn-miss"
          >
            Промах
          </el-button>
        </div>
      </div>

      <el-divider />

      <!-- Проверка дона -->
      <div class="action-row">
        <div class="action-label">
          <span>Проверка дона</span>
        </div>
        <div class="action-buttons">
          <el-button
            v-for="player in allPlayers"
            :key="player.box_id"
            size="small"
            @click="setDonCheck(player.box_id)"
            class="action-btn"
          >
            {{ player.box_id }}
          </el-button>
          <el-button
            type="info"
            size="small"
            plain
            @click="setDonCheck(null)"
            class="action-btn-miss"
          >
            Не проснулся
          </el-button>
        </div>
      </div>

      <el-divider />

      <!-- Проверка шерифа -->
      <div class="action-row">
        <div class="action-label">
          <span>Проверка шерифа</span>
        </div>
        <div class="action-buttons">
          <el-button
            v-for="player in allPlayers"
            :key="player.box_id"
            size="small"
            @click="setSheriffCheck(player.box_id)"
            class="action-btn"
          >
            {{ player.box_id }}
          </el-button>
          <el-button
            type="info"
            size="small"
            plain
            @click="setSheriffCheck(null)"
            class="action-btn-miss"
          >
            Не проснулся
          </el-button>
        </div>
      </div>

      <el-divider />

      <!-- Настройки -->
      <div class="settings-row">
        <el-checkbox v-model="showCheckResults">
          Показывать результаты проверок
        </el-checkbox>
      </div>
    </div>

    <template #footer>
      <el-button
        type="primary"
        @click="handleNextRound"
      >
        {{ phaseId === 1 ? 'Лучший ход' : 'Продолжить' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { GameRolesEnum } from '@/utils/constants.js'

const props = defineProps({
  modelValue: Boolean,
  playersData: {
    type: Array,
    default: () => []
  },
  phaseData: {
    type: Object,
    default: () => ({})
  },
  phaseId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'update:phaseData', 'show-best-move', 'next-round'])

const showCheckResults = ref(true)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Только активные игроки (для отстрела мафии)
const activePlayers = computed(() => {
  const votedBoxIds = props.phaseData.voted_box_ids || []
  return props.playersData.filter(p => p.is_in_game && !votedBoxIds.includes(p.box_id))
})

// Все игроки (для проверок дона и шерифа)
const allPlayers = computed(() => {
  return props.playersData
})

// Установить убитого игрока
const setKilledPlayer = (boxId) => {
  const updatedPhaseData = {
    ...props.phaseData,
    killed_box_id: boxId
  }
  emit('update:phaseData', updatedPhaseData)
}

// Проверка дона
const setDonCheck = (boxId) => {
  const updatedPhaseData = {
    ...props.phaseData,
    don_checked_box_id: boxId
  }
  emit('update:phaseData', updatedPhaseData)

  if (boxId !== null && showCheckResults.value) {
    // Проверяем, является ли игрок шерифом
    const player = props.playersData.find(p => p.box_id === boxId)

    if (player) {
      if (player.role === GameRolesEnum.sheriff) {
        ElMessage({
          message: 'Проверенный игрок шериф',
          type: 'success',
          duration: 1000
        })
      } else {
        ElMessage({
          message: 'Проверенный игрок не шериф',
          type: 'error',
          duration: 1000
        })
      }
    }
  }
}

// Проверка шерифа
const setSheriffCheck = (boxId) => {
  const updatedPhaseData = {
    ...props.phaseData,
    sheriff_checked_box_id: boxId
  }
  emit('update:phaseData', updatedPhaseData)

  if (boxId !== null && showCheckResults.value) {
    // Проверяем, является ли игрок мафией или доном
    const player = props.playersData.find(p => p.box_id === boxId)

    if (player) {
      if (player.role === GameRolesEnum.mafia || player.role === GameRolesEnum.don) {
        ElMessage({
          message: 'Игрок мафия',
          type: 'warning',
          duration: 1000,
          customClass: 'black-toast'
        })
      } else {
        ElMessage({
          message: 'Игрок мирный',
          type: 'error',
          duration: 1000
        })
      }
    }
  }
}

// Обработчик "Следующий круг" или "Лучший ход"
const handleNextRound = () => {
  if (props.phaseId === 1) {
    // Если первый день, показываем модальное окно лучшего хода
    emit('show-best-move')
  } else {
    // Иначе переходим к следующему кругу
    emit('next-round')
  }

  // Закрываем диалог
  visible.value = false
}
</script>

<style scoped>
.night-container {
  padding: 8px 0;
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 8px;
  background-color: #f5f7fa;
  border-radius: 6px;
  transition: all 0.3s;
  min-height: 60px;
}

.action-row:hover {
  background-color: #ecf5ff;
}

.action-label {
  flex: 0 0 150px;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex: 1;
}

.action-btn {
  min-width: 40px;
  padding: 8px 12px;
  margin: 0;
  flex-shrink: 0;
}

.action-btn-miss {
  min-width: 100px;
  margin-left: 12px;
}

.settings-row {
  padding: 12px 16px;
  display: flex;
  justify-content: center;
}

:deep(.el-divider) {
  margin: 16px 0;
}
</style>

<style>
/* Черный тост для проверки шерифа на мафию */
.black-toast {
  background-color: #303133 !important;
}

.black-toast .el-message__content {
  color: white !important;
}

.black-toast .el-message__icon {
  color: white !important;
}
</style>
