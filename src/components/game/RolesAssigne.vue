<template>
  <div class="roles-assigne">
    <!-- Показываем раздачу ролей если договорка еще не началась -->
    <el-card>
    <template #header>
      <div class="card-header">
        <div class="header-left">
          <el-icon><User /></el-icon>
          <span :class="{ 'label-highlight': isLabelHighlighted }">{{ headerLabel }}</span>
        </div>
        <div class="header-right">
          <template v-if="!isNegotiationStarted">
            <el-button
              type="primary"
              @click="handleStartNegotiation"
              :loading="loading"
            >
              Начать договорку
            </el-button>
          </template>
          <template v-else>
            <el-button
              type="danger"
              @click="handleBackToRoles"
              :loading="loading"
            >
              Вернуться к раздаче
            </el-button>
            <el-button
              type="primary"
              @click="handleStartGame"
              :loading="loading"
            >
              Начать игру
            </el-button>
          </template>
        </div>
      </div>
    </template>

    <GameTable :data="props.rolesData">
      <RoleColumn
        :clickable="!isNegotiationStarted"
        :is-default-hidden="isDefaultRolesHidden"
        @role-click="cycleRole"
      />

      <el-table-column
        label="Игрок"
        min-width="200"
      >
        <template #default="{ row }">
          {{ row.nickname }}
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
import { ref, computed, watch, onUnmounted } from 'vue'
import { User } from '@element-plus/icons-vue'
import GameTable from './GameTable.vue'
import RoleColumn from './RoleColumn.vue'
import { apiService } from '@/services/api.js'
import { GameRolesEnum } from '@/utils/constants.js'
import { GAME_ERROR_MESSAGES } from '@/utils/errorMessages.js'

const props = defineProps({
  gameId: {
    type: String,
    required: true
  },
  rolesData: {
    type: Array,
    required: true
  },
  isFreeSeatPhase: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['negotiation-started', 'negotiation-ended', 'game-started', 'update:rolesData'])
const loading = ref(false)
const errorMessage = ref('')
const isNegotiationStarted = ref(false)
const isLabelHighlighted = ref(false)
const isDefaultRolesHidden = ref(false)

const headerLabel = computed(() => {
  if (!isNegotiationStarted.value) {
    return 'Раздача ролей'
  }
  return props.isFreeSeatPhase ? 'Свободная рассадка' : 'Договорка мафии'
})

// Следим за сменой фазы и запускаем анимацию
watch(() => props.isFreeSeatPhase, (newValue) => {
  if (newValue) {
    // Запускаем анимацию подсветки желтым
    isLabelHighlighted.value = true
    setTimeout(() => {
      isLabelHighlighted.value = false
    }, 500)
  }
})

// Порядок смены ролей по кругу
const rolesCycle = [
  GameRolesEnum.civilian,
  GameRolesEnum.sheriff,
  GameRolesEnum.don,
  GameRolesEnum.mafia
]

const cycleRole = (player) => {
  // Блокируем изменение ролей во время договорки
  if (isNegotiationStarted.value) {
    return
  }

  const currentIndex = rolesCycle.indexOf(player.role)
  let nextIndex = (currentIndex + 1) % rolesCycle.length
  let nextRole = rolesCycle[nextIndex]

  // Подсчитываем текущее количество ролей (исключая текущего игрока)
  const roleCount = props.rolesData.reduce((acc, p) => {
    if (p.id !== player.id) {
      acc[p.role] = (acc[p.role] || 0) + 1
    }
    return acc
  }, {})

  // Лимиты ролей
  const roleLimits = {
    [GameRolesEnum.don]: 1,
    [GameRolesEnum.sheriff]: 1,
    [GameRolesEnum.mafia]: 2
  }

  // Пытаемся найти доступную роль, двигаясь по кругу
  let attempts = 0
  while (attempts < rolesCycle.length) {
    // Мирного жителя всегда можно выбрать
    if (nextRole === GameRolesEnum.civilian) {
      updatePlayerRole(player.id, nextRole)
      return
    }

    const currentCount = roleCount[nextRole] || 0
    const limit = roleLimits[nextRole]

    // Если роль доступна (не превышен лимит), выбираем её
    if (currentCount < limit) {
      updatePlayerRole(player.id, nextRole)
      return
    }

    // Переходим к следующей роли
    nextIndex = (nextIndex + 1) % rolesCycle.length
    nextRole = rolesCycle[nextIndex]
    attempts++
  }
}

const updatePlayerRole = (playerId, newRole) => {
  // Создаем новый массив с обновленной ролью игрока
  const updatedData = props.rolesData.map(player =>
    player.id === playerId
      ? { ...player, role: newRole }
      : player
  )
  // Эмитим событие для обновления данных в родительском компоненте
  emit('update:rolesData', updatedData)
}

const handleStartNegotiation = async () => {
  // Очищаем предыдущую ошибку
  errorMessage.value = ''

  // Подсчитываем количество каждой роли
  const roleCount = props.rolesData.reduce((acc, player) => {
    acc[player.role] = (acc[player.role] || 0) + 1
    return acc
  }, {})

  // Проверяем правильность распределения ролей
  const donCount = roleCount[GameRolesEnum.don] || 0
  const sheriffCount = roleCount[GameRolesEnum.sheriff] || 0
  const mafiaCount = roleCount[GameRolesEnum.mafia] || 0

  if (donCount !== 1 || sheriffCount !== 1 || mafiaCount !== 2) {
    errorMessage.value = GAME_ERROR_MESSAGES.INVALID_ROLES
    return
  }

  isNegotiationStarted.value = true
  isDefaultRolesHidden.value = true
  emit('negotiation-started')
}

const handleBackToRoles = () => {
  isNegotiationStarted.value = false
  isDefaultRolesHidden.value = false
  emit('negotiation-ended')
}

const handleStartGame = async () => {
  // Очищаем предыдущую ошибку
  errorMessage.value = ''
  loading.value = true

  try {
    // Собираем список игроков с ролями в формате API
    const playersData = props.rolesData.map(player => ({
      user_id: player.id,
      role: player.role,
      box_id: player.box_id
    }))

    // Вызываем API для создания игроков с ролями
    await apiService.createGamePlayers(props.gameId, playersData)

    // Если успешно (200), уведомляем родительский компонент
    emit('game-started')
  } catch (error) {
    console.error('Failed to start negotiation:', error)

    // Обрабатываем различные типы ошибок
    if (error.response?.status === 400) {
      const detail = error.response?.data?.detail

      // Проверяем конкретное сообщение об ошибке
      if (detail === '1 - don, 1 - sheriff, 2 - mafia, 6 civilians are allowed') {
        errorMessage.value = GAME_ERROR_MESSAGES.INVALID_ROLES
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

onUnmounted(() => {
  errorMessage.value = ''
})
</script>

<style scoped>
.roles-assigne {
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

.error-message {
  padding: 20px;
  text-align: center;
  color: #f56c6c;
  font-size: 14px;
}

.label-highlight {
  animation: highlight-yellow 0.5s ease;
}

@keyframes highlight-yellow {
  0%, 100% {
    background: transparent;
    color: inherit;
  }
  50% {
    background: #fff7e6;
    color: #faad14;
    padding: 4px 8px;
    border-radius: 4px;
  }
}
</style>
