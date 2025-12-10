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
            <div class="player-input-wrapper">
              <el-autocomplete
                v-model="row.searchQuery"
                :fetch-suggestions="(queryString, cb) => querySearch(queryString, cb, row.box_id)"
                placeholder="Введите имя игрока"
                clearable
                :debounce="300"
                value-key="nickname"
                @select="(item) => handleSelect(item, row.box_id)"
                @clear="() => handleClear(row.box_id)"
                @keydown.enter="(event) => handleKeydownEnter(event, row.box_id)"
                @keydown.up="() => handleArrowKey(row.box_id)"
                @keydown.down="() => handleArrowKey(row.box_id)"
                class="player-autocomplete"
              >
                <template #default="{ item }">
                  <div class="autocomplete-item">
                    <span>{{ item.nickname }}</span>
                  </div>
                </template>
              </el-autocomplete>
              <transition name="slide-fade">
                <el-button
                  v-if="row.showCreateButton"
                  type="primary"
                  size="small"
                  :loading="row.isCreating"
                  @click="handleCreatePlayer(row.box_id)"
                  class="create-player-btn"
                >
                  Создать
                </el-button>
              </transition>
            </div>
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
import { ref, computed, nextTick } from 'vue'
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
    user_id: null,
    selectedNickname: '', // Храним ник выбранного пользователя отдельно
    showCreateButton: false,
    isCreating: false,
    currentSuggestions: [], // Храним текущие результаты автокомплита
    isNavigating: false // Флаг навигации по списку стрелками
  }))
)

// Список выбранных пользователей для передачи в API
const selectedUsers = ref([])

// Функция для поиска пользователей
const querySearch = async (queryString, cb, boxId) => {
  // Находим игрока по box_id чтобы обновить состояние
  const player = players.value.find(p => p.box_id === boxId)

  if (!queryString || queryString.trim().length === 0) {
    if (player) {
      player.showCreateButton = false
      player.isNavigating = false
    }
    cb([])
    return
  }

  // Сбрасываем флаг навигации при новом поиске (пользователь печатает)
  if (player) {
    player.isNavigating = false
  }

  // Запоминаем время начала запроса для минимальной задержки
  const startTime = Date.now()

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

    // Показываем кнопку создания если есть текст и:
    // - игрок еще не выбран (user_id === null)
    // - или введенный текст отличается от выбранного игрока
    if (player) {
      const hasText = queryString.trim().length > 0
      const isNewText = player.user_id === null || queryString.trim() !== player.selectedNickname
      player.showCreateButton = hasText && isNewText
      player.currentSuggestions = suggestions // Сохраняем для использования в handleKeydownEnter
    }

    // Вычисляем оставшееся время для минимальной задержки 125ms
    const elapsed = Date.now() - startTime
    const minDelay = 125
    const remainingDelay = Math.max(0, minDelay - elapsed)

    // Задерживаем показ результатов для плавной анимации загрузки
    setTimeout(() => {
      cb(suggestions)
    }, remainingDelay)

  } catch (error) {
    console.error('Ошибка при поиске пользователей:', error)
    if (player) {
      const hasText = queryString.trim().length > 0
      const isNewText = player.user_id === null || queryString.trim() !== player.selectedNickname
      player.showCreateButton = hasText && isNewText
      player.currentSuggestions = [] // Очищаем suggestions при ошибке
    }

    // Также добавляем минимальную задержку для ошибок
    const elapsed = Date.now() - startTime
    const minDelay = 125
    const remainingDelay = Math.max(0, minDelay - elapsed)

    setTimeout(() => {
      cb([])
    }, remainingDelay)
  }
}

// Обработчик нажатия стрелок вверх/вниз
const handleArrowKey = (boxId) => {
  const player = players.value.find(p => p.box_id === boxId)
  // Устанавливаем флаг только если есть доступные suggestions
  if (player && player.currentSuggestions && player.currentSuggestions.length > 0) {
    player.isNavigating = true
  }
}

// Функция для фокусировки на следующем поле
const focusNextField = (currentBoxId) => {
  // Если это последнее поле (box_id === 10), не переходим дальше
  if (currentBoxId >= 10) return

  // Используем nextTick для ожидания обновления DOM
  nextTick(() => {
    // Находим все autocomplete input'ы на странице
    const allInputs = document.querySelectorAll('.player-autocomplete input')

    // Находим текущий input по box_id (индекс = box_id - 1)
    const currentIndex = currentBoxId - 1

    // Находим следующий input
    const nextInput = allInputs[currentIndex + 1]

    if (nextInput) {
      nextInput.focus()
    }
  })
}

// Обработчик выбора игрока
const handleSelect = (item, boxId) => {
  // Находим игрока по box_id
  const player = players.value.find(p => p.box_id === boxId)
  if (player) {
    player.user_id = item.id
    player.searchQuery = item.nickname
    player.selectedNickname = item.nickname
    player.showCreateButton = false
    player.isNavigating = false // Сбрасываем флаг при выборе
  }

  // Обновляем список выбранных пользователей
  updateSelectedUsers()

  // Переходим к следующему полю
  focusNextField(boxId)
}

// Обработчик очистки поля
const handleClear = (boxId) => {
  // Находим игрока по box_id
  const player = players.value.find(p => p.box_id === boxId)
  if (player) {
    player.user_id = null
    player.searchQuery = ''
    player.selectedNickname = ''
    player.showCreateButton = false
    player.isNavigating = false // Сбрасываем флаг при очистке
  }

  // Обновляем список выбранных пользователей
  updateSelectedUsers()
}

// Обработчик нажатия Enter в поле ввода
const handleKeydownEnter = (event, boxId) => {
  const player = players.value.find(p => p.box_id === boxId)

  if (!player) return

  // Если пользователь навигировал по списку стрелками и есть suggestions,
  // даем el-autocomplete обработать Enter и выбрать активный элемент
  if (player.isNavigating && player.currentSuggestions && player.currentSuggestions.length > 0) {
    // Не делаем ничего - el-autocomplete сам обработает Enter и вызовет @select
    return
  }

  // Если пользователь НЕ навигировал стрелками, проверяем точное совпадение
  if (!player.isNavigating) {
    const exactMatch = player.currentSuggestions.find(s => s.nickname === player.searchQuery.trim())
    if (exactMatch) {
      handleSelect(exactMatch, boxId)
      return
    }
  }

  // Только если нет навигации, нет совпадений и есть кнопка создания
  // создаем нового пользователя
  if (player.showCreateButton) {
    event.preventDefault()
    handleCreatePlayer(boxId)
  }
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

// Обработчик создания нового игрока
const handleCreatePlayer = async (boxId) => {
  const player = players.value.find(p => p.box_id === boxId)
  if (!player || !player.searchQuery.trim()) {
    return
  }

  // Если есть найденные пользователи (suggestions), выбираем первого из них
  // вместо создания нового - это предотвращает дублирование
  if (player.currentSuggestions.find(p => p.nickname === player.searchQuery.trim())) {
    const firstSuggestion = player.currentSuggestions[0]
    handleSelect(firstSuggestion, boxId)
    return
  }

  player.isCreating = true
  errorMessage.value = ''

  try {
    const nickname = player.searchQuery.trim()
    // Создаем нового пользователя
    const newUser = await apiService.createUser({
      nickname: nickname
    })

    // Автоматически выбираем созданного пользователя
    // Используем тот же порядок что и в handleSelect (который работает корректно)
    player.user_id = newUser.id
    player.searchQuery = nickname // api не возвращает ник нового пользователя
    player.selectedNickname = nickname
    player.showCreateButton = false
    player.isNavigating = false // Сбрасываем флаг после создания

    // Обновляем список выбранных пользователей
    updateSelectedUsers()

    // Переходим к следующему полю
    focusNextField(boxId)
  } catch (error) {
    console.error('Ошибка при создании игрока:', error)
    errorMessage.value = 'Не удалось создать игрока. Попробуйте снова.'
    // Кнопка остается видимой (showCreateButton не меняется) для повторной попытки
  } finally {
    player.isCreating = false
  }
}

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

.player-input-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  overflow: hidden;
}

.player-autocomplete {
  flex: 1;
  min-width: 0;
  /* Плавное изменение размера синхронно с кнопкой */
  transition: all 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Добавляем плавный переход для внутреннего input */
.player-autocomplete :deep(.el-input__wrapper) {
  transition: all 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.create-player-btn {
  flex-shrink: 0;
  margin-left: 8px;
  transition: margin-left 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Плавная синхронная анимация для кнопки создания */
.slide-fade-enter-active {
  transition: all 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  transform: translateX(15px) scale(0.95);
  opacity: 0;
  width: 0;
  margin-left: 0;
  padding-left: 0;
  padding-right: 0;
}

.slide-fade-leave-to {
  transform: translateX(15px) scale(0.95);
  opacity: 0;
  width: 0;
  margin-left: 0;
  padding-left: 0;
  padding-right: 0;
}
</style>
