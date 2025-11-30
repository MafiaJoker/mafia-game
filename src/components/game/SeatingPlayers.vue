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
          min-width="200"
        >
          <template #default="{ row }">
            <el-autocomplete
              v-model="row.searchQuery"
              :fetch-suggestions="querySearch"
              placeholder="Введите имя игрока"
              clearable
              :debounce="300"
              value-key="nickname"
              @select="(item) => handleSelect(item, row.box_id)"
              @clear="() => handleClear(row.box_id)"
              style="width: 100%"
            >
              <template #default="{ item }">
                <div class="autocomplete-item">
                  <span>{{ item.nickname }}</span>
                </div>
              </template>
            </el-autocomplete>
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

// Функция для поиска пользователей
const querySearch = async (queryString, cb) => {
  if (!queryString || queryString.trim().length === 0) {
    cb([])
    return
  }

  try {
    const params = { nickname: queryString }

    // Добавляем event_id если включен режим закрытой рассадки
    if (isClosedSeating.value && props.eventId) {
      params.event_id = props.eventId
    }

    const users = await apiService.getUsers(params)

    // Получаем ID уже выбранных пользователей
    const selectedUserIds = selectedUsers.value.map(u => u.user_id)

    // Преобразуем результаты в формат для autocomplete и фильтруем уже выбранных
    const suggestions = users.items
      .filter(user => !selectedUserIds.includes(user.id))
      .map(user => ({
        value: user.nickname,
        nickname: user.nickname,
        id: user.id
      }))
    cb(suggestions)
  } catch (error) {
    console.error('Ошибка при поиске пользователей:', error)
    cb([])
  }
}

// Обработчик выбора игрока
const handleSelect = (item, boxId) => {
  // Находим игрока по box_id
  const player = players.value.find(p => p.box_id === boxId)
  if (player) {
    player.user_id = item.id
    player.searchQuery = item.nickname
  }

  // Обновляем список выбранных пользователей
  updateSelectedUsers()
}

// Обработчик очистки поля
const handleClear = (boxId) => {
  // Находим игрока по box_id
  const player = players.value.find(p => p.box_id === boxId)
  if (player) {
    player.user_id = null
    player.searchQuery = ''
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
