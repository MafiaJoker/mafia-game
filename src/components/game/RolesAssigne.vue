<template>
  <div class="roles-assigne">
    <!-- Показываем раздачу ролей если договорка еще не началась -->
    <el-card>
    <template #header>
      <div class="card-header">
        <div class="header-left">
          <el-icon><User /></el-icon>
          <span>{{ isNegotiationStarted ? 'Договорка мафии' : 'Раздача ролей' }}</span>
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

    <GameTable :data="rolesData">
      <el-table-column
        label="Роль"
        width="60"
        align="left"
      >
        <template #default="{ row }">
          <div @click="cycleRole(row)" style="cursor: pointer;">
            <CitizenIcon v-if="row.role === GameRolesEnum.civilian" />
            <SheriffIcon v-else-if="row.role === GameRolesEnum.sheriff" />
            <DonIcon v-else-if="row.role === GameRolesEnum.don" />
            <MafiaIcon v-else-if="row.role === GameRolesEnum.mafia" />
          </div>
        </template>
      </el-table-column>

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
import { ref, onMounted, onUnmounted } from 'vue'
import { User } from '@element-plus/icons-vue'
import GameTable from './GameTable.vue'
import CitizenIcon from './icons/CitizenIcon.vue'
import SheriffIcon from './icons/SheriffIcon.vue'
import DonIcon from './icons/DonIcon.vue'
import MafiaIcon from './icons/MafiaIcon.vue'
import { apiService } from '@/services/api.js'
import { GameRolesEnum } from '@/utils/constants.js'
import { GAME_ERROR_MESSAGES } from '@/utils/errorMessages.js'

const props = defineProps({
  gameId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['negotiation-started', 'negotiation-ended'])

const rolesData = ref([])
const loading = ref(false)
const errorMessage = ref('')
const showPreGame = ref(false)
const isNegotiationStarted = ref(false)

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

  // Мирного жителя можно всегда выбрать, независимо от лимитов
  if (nextRole === GameRolesEnum.civilian) {
    player.role = nextRole
    return
  }

  // Подсчитываем текущее количество ролей (исключая текущего игрока)
  const roleCount = rolesData.value.reduce((acc, p) => {
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
      player.role = nextRole
      return
    }

    const currentCount = roleCount[nextRole] || 0
    const limit = roleLimits[nextRole]

    // Если роль доступна (не превышен лимит), выбираем её
    if (currentCount < limit) {
      player.role = nextRole
      return
    }

    // Переходим к следующей роли
    nextIndex = (nextIndex + 1) % rolesCycle.length
    nextRole = rolesCycle[nextIndex]
    attempts++
  }

}

const loadGameData = async () => {
  try {
    const gameData = await apiService.getGame(props.gameId)

    // Преобразуем данные игроков в формат для таблицы
    if (gameData.players && Array.isArray(gameData.players)) {
      rolesData.value = gameData.players.map(player => ({
        id: player.id,
        nickname: player.nickname,
        box_id: player.box_id,
        role: player.role || GameRolesEnum.civilian
      }))
    }
  } catch (error) {
    console.error('Failed to load game data:', error)
    rolesData.value = []
  }
}

const handleStartNegotiation = async () => {
  isNegotiationStarted.value = true
  emit('negotiation-started')
}

const handleBackToRoles = () => {
  isNegotiationStarted.value = false
  emit('negotiation-ended')
}

const handleStartGame = async () => {
  // Очищаем предыдущую ошибку
  errorMessage.value = ''
  loading.value = true

  try {
    // Собираем список игроков с ролями в формате API
    const playersData = rolesData.value.map(player => ({
      user_id: player.id,
      role: player.role,
      box_id: player.box_id
    }))

    // Вызываем API для создания игроков с ролями
    await apiService.createGamePlayers(props.gameId, playersData)

    // Если успешно (200), показываем PreGamePhaseView
    showPreGame.value = true
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

onMounted(() => {
  loadGameData()
})

onUnmounted(() => {
  rolesData.value = []
  showPreGame.value = false
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
</style>
