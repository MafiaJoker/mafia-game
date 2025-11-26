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
import { ref, watch } from 'vue'
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
  },
  registeredUsers: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'player-selected'])

const playerName = ref(props.modelValue)
const isSearching = ref(false)
const selectedUser = ref(null) // Хранит последнего выбранного пользователя

// Функция поиска для автодополнения
const querySearch = async (queryString, cb) => {
  // Режим закрытой рассадки - фильтруем локально из переданных зарегистрированных пользователей
  if (props.closedSeating) {
    let availableUsers = props.registeredUsers.filter(user =>
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
      const existingUser = props.registeredUsers.find(user =>
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