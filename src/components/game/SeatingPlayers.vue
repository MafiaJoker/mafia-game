<template>
  <div class="seating-players">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <div class="header-title">
              <div class="title-row">
                <el-icon><UserFilled /></el-icon>
                <span>Рассадка игроков</span>
              </div>
              <div v-if="isClosedSeating" class="subtitle">
                (только зарегистрированные)
              </div>
            </div>
          </div>
          <div class="header-right">
            <el-button
              type="primary"
              @click="handleSeatingComplete"
              :loading="loading"
            >
              Рассадка готова
            </el-button>
          </div>
        </div>
      </template>

      <GameTable :data="players">
        <el-table-column
          label="Игрок"
          min-width="250"
        >
          <template #default="{ row }">
            <PlayerSearchInput
              :ref="element => setPlayerInput(row.box_id, element)"
              v-model="row.searchQuery"
              :exclude-ids="selectedUserIds"
              :event-id="isClosedSeating ? eventId : null"
              size="small"
              @select="player => handleSelect(player, row.box_id)"
              @clear="() => handleClear(row.box_id)"
              @error="message => errorMessage = message"
            />
          </template>
        </el-table-column>
      </GameTable>

      <!-- Сообщение об ошибке -->
      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="false"
        style="margin-top: 16px"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { UserFilled } from '@element-plus/icons-vue'
import { apiService } from '@/services/api'
import PlayerSearchInput from '@/components/common/PlayerSearchInput.vue'
import GameTable from './GameTable.vue'
import { GAME_ERROR_MESSAGES } from '@/utils/errorMessages.js'

const props = defineProps({
  gameId: {
    type: String,
    required: true
  },
  eventId: {
    type: String,
    required: false,
    default: null
  }
})

const emit = defineEmits(['seating-complete'])

// Проверяем режим закрытой рассадки
const isClosedSeating = computed(() => {
  if (!props.eventId) return false
  const savedClosedSeating = localStorage.getItem(`event_${props.eventId}_closed_seating`)
  return savedClosedSeating === 'true'
})

// Инициализируем массив игроков (10 мест)
const players = ref(
  Array.from({ length: 10 }, (_, i) => ({
    box_id: i + 1,
    searchQuery: '',
    user_id: null
  }))
)

// Список выбранных пользователей для передачи в API
const selectedUsers = ref([])

// Одного игрока за два стола не посадить
const selectedUserIds = computed(() => selectedUsers.value.map(user => user.user_id))

// Строки поиска, чтобы перевести фокус на следующее место
const playerInputs = {}

const setPlayerInput = (boxId, element) => {
  if (element) {
    playerInputs[boxId] = element
  } else {
    delete playerInputs[boxId]
  }
}

// Игрока посадили - курсор идет на следующее место
const focusNextField = (currentBoxId) => {
  playerInputs[currentBoxId + 1]?.focus()
}

// Обработчик выбора игрока
const handleSelect = (player, boxId) => {
  const row = players.value.find(p => p.box_id === boxId)
  if (row) {
    row.user_id = player.id
    row.searchQuery = player.nickname
  }

  // Обновляем список выбранных пользователей
  updateSelectedUsers()

  // Переходим к следующему полю
  focusNextField(boxId)
}

// Обработчик очистки поля
const handleClear = (boxId) => {
  const row = players.value.find(p => p.box_id === boxId)
  if (row) {
    row.user_id = null
    row.searchQuery = ''
  }

  // Обновляем список выбранных пользователей
  updateSelectedUsers()
}

// Функция для обновления списка выбранных пользователей
const updateSelectedUsers = () => {
  selectedUsers.value = players.value
    .filter(p => p.user_id !== null)
    .map(p => ({
      user_id: p.user_id,
      box_id: p.box_id
    }))
}

// Состояние загрузки и ошибки
const loading = ref(false)
const errorMessage = ref('')

// Обработчик нажатия кнопки "Рассадка готова"
const handleSeatingComplete = async () => {
  // Очищаем предыдущую ошибку
  errorMessage.value = ''

  // Проверяем, что выбрано ровно 10 игроков
  if (selectedUsers.value.length !== 10) {
    errorMessage.value = GAME_ERROR_MESSAGES.NOT_TEN_PLAYERS
    return
  }

  loading.value = true

  try {
    // Вызываем API для создания игроков
    await apiService.createGamePlayers(props.gameId, selectedUsers.value)

    // Если успешно (200), уведомляем родительский компонент
    emit('seating-complete')
  } catch (error) {
    console.error('Ошибка при создании игроков:', error)

    // Обрабатываем различные типы ошибок
    if (error.response?.status === 400) {
      const detail = error.response?.data?.detail

      // Проверяем конкретное сообщение об ошибке
      if (detail === 'only ten boxes is allowed') {
        errorMessage.value = GAME_ERROR_MESSAGES.NOT_TEN_PLAYERS
      } else {
        errorMessage.value = GAME_ERROR_MESSAGES.UNKNOWN_ERROR
      }
    } else if (error.response?.status >= 500) {
      errorMessage.value = GAME_ERROR_MESSAGES.UNKNOWN_ERROR
    } else {
      errorMessage.value = GAME_ERROR_MESSAGES.UNKNOWN_ERROR
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.seating-players {
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

.header-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subtitle {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
  margin-left: 24px;
}

</style>
