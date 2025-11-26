<template>
  <el-autocomplete
    v-model="playerName"
    :fetch-suggestions="querySearch"
    placeholder="Введите имя игрока"
    @select="handleSelect"
    @blur="handleBlur"
    @clear="handleClear"
    clearable
    :loading="isSearching"
    class="player-selector"
    :style="{ width: '100%' }"
  >
    <template #default="{ item }">
      <div class="suggestion-item">
        <span class="nickname">{{ item.nickname }}</span>
      </div>
    </template>
  </el-autocomplete>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { apiService } from '@/services/api'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  playerId: {
    type: [String, Number],
    required: true
  },
  usedPlayerIds: {
    type: Array,
    default: () => []
  },
  eventId: {
    type: [String, Number],
    default: null
  },
  closedSeating: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'player-selected'])

const playerName = ref(props.modelValue)
const allUsers = ref([])
const isSearching = ref(false)
const selectedUser = ref(null) // Хранит последнего выбранного пользователя

// Загружаем список пользователей только для закрытой рассадки
onMounted(async () => {
  // Загружаем пользователей только если режим закрытой рассадки
  if (props.closedSeating) {
    await loadRegisteredUsers()
  }
})

// Функция загрузки зарегистрированных пользователей (для закрытой рассадки)
const loadRegisteredUsers = async () => {
  try {
    if (props.eventId) {
      // Загружаем только подтвержденных участников события
      const response = await apiService.getEventRegistrations(props.eventId, {
        status: 'confirmed',
        pageSize: 100
      })
      allUsers.value = (response.items || []).map(reg => ({
        nickname: reg.user?.nickname || reg.user_nickname,
        id: reg.user?.id || reg.user_id,
        value: reg.user?.nickname || reg.user_nickname
      }))
    }
  } catch (error) {
    console.error('Error loading registered users:', error)
  }
}

// Функция поиска для автодополнения
const querySearch = async (queryString, cb) => {
  // Режим закрытой рассадки - фильтруем локально из загруженных пользователей
  if (props.closedSeating) {
    let availableUsers = allUsers.value.filter(user =>
      !props.usedPlayerIds.includes(user.id)
    )

    const results = queryString
      ? availableUsers.filter(user =>
          user.nickname.toLowerCase().includes(queryString.toLowerCase())
        )
      : availableUsers

    cb(results)
    return
  }

  // Режим открытой рассадки - делаем динамический поиск через API
  if (!queryString || queryString.trim().length === 0) {
    cb([])
    return
  }

  try {
    isSearching.value = true
    const response = await apiService.getUsers({
      nickname: queryString.trim(),
      pageSize: 20
    })

    const users = (response.items || []).map(user => ({
      nickname: user.nickname,
      id: user.id,
      value: user.nickname
    }))

    // Фильтруем уже использованных пользователей
    const availableUsers = users.filter(user =>
      !props.usedPlayerIds.includes(user.id)
    )

    cb(availableUsers)
  } catch (error) {
    console.error('Error searching users:', error)
    cb([])
  } finally {
    isSearching.value = false
  }
}

// Обработчик выбора игрока
const handleSelect = (item) => {
  if (props.usedPlayerIds.includes(item.id)) {
    // ElMessage.warning('Этот игрок уже выбран')
    return
  }

  // Сохраняем выбранного пользователя
  selectedUser.value = item

  playerName.value = item.nickname
  emit('update:modelValue', item.nickname)
  emit('player-selected', {
    playerId: props.playerId,
    playerName: item.nickname,
    userId: item.id
  })
}

// Обработчик потери фокуса
const handleBlur = () => {
  emit('update:modelValue', playerName.value)

  if (playerName.value.trim()) {
    // В режиме закрытой рассадки проверяем наличие пользователя в списке
    if (props.closedSeating) {
      const existingUser = allUsers.value.find(user =>
        user.nickname.toLowerCase() === playerName.value.toLowerCase()
      )

      if (existingUser && props.usedPlayerIds.includes(existingUser.id)) {
        playerName.value = ''
        emit('update:modelValue', '')
        emit('player-selected', {
          playerId: props.playerId,
          playerName: '',
          userId: null
        })
        return
      }

      emit('player-selected', {
        playerId: props.playerId,
        playerName: playerName.value,
        userId: existingUser ? existingUser.id : null
      })
    } else {
      // В режиме открытой рассадки проверяем что пользователь был выбран из списка
      if (selectedUser.value && selectedUser.value.nickname === playerName.value) {
        // Пользователь был выбран из списка - всё ОК
        emit('player-selected', {
          playerId: props.playerId,
          playerName: playerName.value,
          userId: selectedUser.value.id
        })
      } else {
        // Пользователь ввёл имя вручную без выбора - очищаем поле
        playerName.value = ''
        emit('update:modelValue', '')
        selectedUser.value = null
        emit('player-selected', {
          playerId: props.playerId,
          playerName: '',
          userId: null
        })
      }
    }
  } else {
    // Если поле пустое, просто очищаем игрока
    selectedUser.value = null
    emit('player-selected', {
      playerId: props.playerId,
      playerName: '',
      userId: null
    })
  }
}

// Обработчик очистки
const handleClear = () => {
  playerName.value = ''
  selectedUser.value = null
  emit('update:modelValue', '')
  emit('player-selected', {
    playerId: props.playerId,
    playerName: '',
    userId: null
  })
}

// Синхронизация с родительским компонентом
watch(() => props.modelValue, (newValue) => {
  playerName.value = newValue
})

watch(playerName, (newValue) => {
  emit('update:modelValue', newValue)
})

// Перезагружаем список пользователей при изменении eventId или closedSeating
watch([() => props.eventId, () => props.closedSeating], async ([newEventId], [oldEventId]) => {
  if (newEventId !== oldEventId) {
    // Загружаем пользователей только для режима закрытой рассадки
    if (props.closedSeating) {
      await loadRegisteredUsers()
    } else {
      // В открытом режиме очищаем список, так как поиск будет динамическим
      allUsers.value = []
    }
  }
})
</script>

<style scoped>
.player-selector {
  width: 100%;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nickname {
  font-weight: 500;
}
</style>