<template>
  <div class="player-search-input">
    <el-autocomplete
      ref="autocompleteRef"
      v-model="query"
      :fetch-suggestions="querySearch"
      :placeholder="placeholder"
      :debounce="0"
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
          <el-avatar
            v-if="item.avatar"
            :size="24"
            :src="item.avatar"
            class="autocomplete-avatar"
          />
          <IconDefaultAvatar v-else :size="24" class="autocomplete-avatar-empty" />
          <span class="autocomplete-nickname">{{ item.nickname }}</span>
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
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { apiService } from '@/services/api'
import IconDefaultAvatar from '@/components/icons/IconDefaultAvatar.vue'
import { pickPrimaryAvatar } from '@/utils/avatars'

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
  // Пауза перед запросом. Автокомплиту её не отдаём: пока он ждёт своей
  // паузы, список продолжает показывать прошлый поиск
  debounce: {
    type: Number,
    default: 300
  }
})

const emit = defineEmits(['update:modelValue', 'select', 'clear', 'error'])

const autocompleteRef = ref(null)
// Последний ответ сервера целиком: пока летит новый запрос, показываем из
// него то, что подходит под набранное
const lastResults = ref([])
// Подсказки, которые судья видит прямо сейчас
const suggestions = ref([])
const showCreateButton = ref(false)
const isCreating = ref(false)
// Ник выбранного игрока: пока текст ему равен, создавать нечего
const selectedNickname = ref('')
// Стрелками судья ходит по подсказкам, и Enter тогда за автокомплитом
const isNavigating = ref(false)

// Колбэк автокомплита живёт до следующего нажатия клавиши: ответ приходит
// позже, и отдавать подсказки нужно в самый свежий
let pendingCallback = null
let searchTimer = null
// Ответы возвращаются не в том порядке, в каком уходили запросы: применяем
// только последний, иначе список перезатирает чужой поиск
let searchToken = 0

const query = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Поле очистили снаружи - забываем и выбранного игрока
watch(() => props.modelValue, (value) => {
  if (!value) {
    cancelPendingSearch()
    selectedNickname.value = ''
    showCreateButton.value = false
    lastResults.value = []
    showSuggestions([])
    isNavigating.value = false
  }
})

// Запрос, который ещё не ушёл или уже не нужен: его ответ применять нельзя
const cancelPendingSearch = () => {
  searchToken++
  clearTimeout(searchTimer)
  searchTimer = null
}

// Игроки, которых уже взяли: в подсказках им делать нечего
const withoutTaken = (items) => items.filter(item => !props.excludeIds.includes(item.id))

// То, что можно показать ДО ответа сервера: только прошлые находки, которые
// точно совпадают с набранным. Иначе весь запрос в списке висят люди из
// прошлого поиска, и выбрать можно чужого. Ответ сервера так не сужаем:
// он ищет по похожести ника и находит в том числе с опечаткой
const narrow = (items, text) => {
  const needle = text.toLowerCase()
  return withoutTaken(items).filter(item => item.nickname.toLowerCase().includes(needle))
}

const showSuggestions = (items) => {
  suggestions.value = items
  pendingCallback?.(items)
}

const querySearch = (queryString, callback) => {
  const text = (queryString || '').trim()
  // Судья печатает - значит по списку он больше не ходит
  isNavigating.value = false
  pendingCallback = callback
  cancelPendingSearch()

  if (!text) {
    lastResults.value = []
    showCreateButton.value = false
    showSuggestions([])
    return
  }

  // Отвечаем сразу: автокомплит держит список открытым, пока идёт загрузка,
  // и на её месте иначе мигает то спиннер, то пустота. Показываем то, что уже
  // знаем и что подходит под набранное - список меняется без миганий
  showSuggestions(narrow(lastResults.value, text))

  const token = searchToken
  searchTimer = setTimeout(() => searchPlayers(text, token), props.debounce)
}

const searchPlayers = async (text, token) => {
  searchTimer = null
  try {
    const params = { nickname: text }
    if (props.eventId) params.event_id = props.eventId

    const users = await apiService.getUsers(params)
    // Пока летел ответ, судья набрал другое - этот список уже не про то
    if (token !== searchToken) return
    lastResults.value = (users.items || []).map(user => ({
      id: user.id,
      nickname: user.nickname,
      value: user.nickname,
      // Аватарка приходит вместе со списком, отдельного запроса не нужно
      avatar: pickPrimaryAvatar(user.avatars)
    }))
  } catch (error) {
    if (token !== searchToken) return
    console.error('Ошибка при поиске игроков:', error)
    lastResults.value = []
  }

  showSuggestions(withoutTaken(lastResults.value))
  showCreateButton.value = text !== selectedNickname.value
}

const startNavigation = () => {
  if (suggestions.value.length > 0) isNavigating.value = true
}

const handleSelect = (item) => {
  // Игрока выбрали - ответ незакрытого запроса открыл бы список заново
  cancelPendingSearch()
  selectedNickname.value = item.nickname
  query.value = item.nickname
  showCreateButton.value = false
  isNavigating.value = false
  suggestions.value = []
  emit('select', { id: item.id, nickname: item.nickname })
}

const handleClear = () => {
  cancelPendingSearch()
  selectedNickname.value = ''
  showCreateButton.value = false
  isNavigating.value = false
  lastResults.value = []
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

onBeforeUnmount(cancelPendingSearch)

const focus = () => {
  autocompleteRef.value?.focus()
}

defineExpose({ focus })
</script>

<style scoped>
.autocomplete-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.autocomplete-avatar {
  flex-shrink: 0;
}

.autocomplete-avatar-empty {
  flex-shrink: 0;
  color: #c0c4cc;
}

.autocomplete-nickname {
  overflow: hidden;
  text-overflow: ellipsis;
}

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
