<template>
  <div class="player-search-input">
    <el-autocomplete
      ref="autocompleteRef"
      v-model="query"
      :fetch-suggestions="querySearch"
      :placeholder="placeholder"
      :debounce="debounce"
      :size="size"
      value-key="nickname"
      clearable
      class="player-autocomplete"
      @select="handleSelect"
      @clear="handleClear"
      @keydown.enter="handleKeydownEnter"
      @keydown.up="startNavigation"
      @keydown.down="startNavigation"
    >
      <template #default="{ item }">
        <div class="autocomplete-item">
          <span>{{ item.nickname }}</span>
        </div>
      </template>
    </el-autocomplete>

    <transition name="slide-fade">
      <el-button
        v-if="allowCreate && showCreateButton"
        type="primary"
        :size="size"
        :loading="isCreating"
        class="create-player-btn"
        @click="createPlayer"
      >
        Создать
      </el-button>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { apiService } from '@/services/api'

// Подсказки показываем не раньше этой отсечки: иначе индикатор загрузки мигает
const MIN_SEARCH_DELAY = 125

const CREATE_PLAYER_ERROR = 'Не удалось создать игрока. Попробуйте снова'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  // Игроки, которых уже взяли: в подсказках им делать нечего
  excludeIds: {
    type: Array,
    default: () => []
  },
  // Задан - ищем только среди игроков мероприятия (закрытая рассадка)
  eventId: {
    type: String,
    default: null
  },
  placeholder: {
    type: String,
    default: 'Введите имя игрока'
  },
  allowCreate: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'default'
  },
  debounce: {
    type: Number,
    default: 300
  }
})

const emit = defineEmits(['update:modelValue', 'select', 'clear', 'error'])

const autocompleteRef = ref(null)
const suggestions = ref([])
const showCreateButton = ref(false)
const isCreating = ref(false)
// Ник выбранного игрока: пока текст ему равен, создавать нечего
const selectedNickname = ref('')
// Стрелками судья ходит по подсказкам, и Enter тогда за автокомплитом
const isNavigating = ref(false)

const query = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Поле очистили снаружи - забываем и выбранного игрока
watch(() => props.modelValue, (value) => {
  if (!value) {
    selectedNickname.value = ''
    showCreateButton.value = false
    suggestions.value = []
    isNavigating.value = false
  }
})

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const querySearch = async (queryString, callback) => {
  const text = (queryString || '').trim()
  if (!text) {
    suggestions.value = []
    showCreateButton.value = false
    isNavigating.value = false
    callback([])
    return
  }

  // Судья печатает - значит по списку он больше не ходит
  isNavigating.value = false
  const startedAt = Date.now()

  try {
    const params = { nickname: text }
    if (props.eventId) params.event_id = props.eventId

    const users = await apiService.getUsers(params)
    suggestions.value = (users.items || [])
      .filter(user => !props.excludeIds.includes(user.id))
      .map(user => ({ id: user.id, nickname: user.nickname, value: user.nickname }))
  } catch (error) {
    console.error('Ошибка при поиске игроков:', error)
    suggestions.value = []
  }

  showCreateButton.value = text !== selectedNickname.value
  await wait(Math.max(0, MIN_SEARCH_DELAY - (Date.now() - startedAt)))
  callback(suggestions.value)
}

const startNavigation = () => {
  if (suggestions.value.length > 0) isNavigating.value = true
}

const handleSelect = (item) => {
  selectedNickname.value = item.nickname
  query.value = item.nickname
  showCreateButton.value = false
  isNavigating.value = false
  suggestions.value = []
  emit('select', { id: item.id, nickname: item.nickname })
}

const handleClear = () => {
  selectedNickname.value = ''
  showCreateButton.value = false
  isNavigating.value = false
  suggestions.value = []
  emit('clear')
}

// Enter только выбирает уже существующего игрока: нового заводит осознанный
// клик по кнопке, иначе лишний игрок появляется случайным нажатием.
// Выбор стрелками остается за автокомплитом: он вызовет select сам
const handleKeydownEnter = () => {
  const text = query.value.trim()
  if (!text || (isNavigating.value && suggestions.value.length > 0)) return

  const exactMatch = suggestions.value.find(item => item.nickname === text)
  if (exactMatch) handleSelect(exactMatch)
}

const createPlayer = async () => {
  const nickname = query.value.trim()
  if (!nickname || isCreating.value) return

  // Тезка из подсказок - это тот же игрок, второго такого заводить незачем
  const exactMatch = suggestions.value.find(item => item.nickname === nickname)
  if (exactMatch) {
    handleSelect(exactMatch)
    return
  }

  isCreating.value = true
  try {
    const newUser = await apiService.createUser({ nickname })
    // Ник нового игрока api не возвращает, поэтому берем введенный
    handleSelect({ id: newUser.id, nickname })
  } catch (error) {
    console.error('Ошибка при создании игрока:', error)
    // Кнопка остается на месте, чтобы попробовать еще раз
    emit('error', CREATE_PLAYER_ERROR)
  } finally {
    isCreating.value = false
  }
}

const focus = () => {
  autocompleteRef.value?.focus()
}

defineExpose({ focus })
</script>

<style scoped>
.player-search-input {
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
