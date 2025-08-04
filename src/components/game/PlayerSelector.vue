<template>
  <el-autocomplete
    v-model="playerName"
    :fetch-suggestions="querySearch"
    placeholder="Введите имя игрока"
    @select="handleSelect"
    @blur="handleBlur"
    @clear="handleClear"
    clearable
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
  }
})

const emit = defineEmits(['update:modelValue', 'player-selected'])

const playerName = ref(props.modelValue)
const allUsers = ref([])

// Загружаем список всех пользователей
onMounted(async () => {
  try {
    const response = await apiService.getUsers()
    allUsers.value = (response.items || response || []).map(user => ({
      nickname: user.nickname || 'Без никнейма',
      id: user.id,
      value: user.nickname || 'Без никнейма'
    }))
  } catch (error) {
    console.error('Error loading users:', error)
  }
})

// Функция поиска для автодополнения
const querySearch = (queryString, cb) => {
  let availableUsers = allUsers.value.filter(user => 
    !props.usedPlayerIds.includes(user.id)
  )
  
  const results = queryString
    ? availableUsers.filter(user => 
        user.nickname.toLowerCase().includes(queryString.toLowerCase())
      )
    : availableUsers
  
  cb(results)
}

// Обработчик выбора игрока
const handleSelect = (item) => {
  if (props.usedPlayerIds.includes(item.id)) {
    // ElMessage.warning('Этот игрок уже выбран')
    return
  }
  
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
    // Проверяем есть ли пользователь с таким именем в базе
    const existingUser = allUsers.value.find(user => 
      user.nickname.toLowerCase() === playerName.value.toLowerCase()
    )
    
    if (existingUser && props.usedPlayerIds.includes(existingUser.id)) {
      // ElMessage.warning('Этот игрок уже выбран')
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
    // Если поле пустое, просто очищаем игрока
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