<template>
  <div class="roles-assigne">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><User /></el-icon>
            <span>Раздача ролей</span>
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
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { User } from '@element-plus/icons-vue'
import GameTable from './GameTable.vue'
import CitizenIcon from './icons/CitizenIcon.vue'
import SheriffIcon from './icons/SheriffIcon.vue'
import DonIcon from './icons/DonIcon.vue'
import MafiaIcon from './icons/MafiaIcon.vue'
import { apiService } from '@/services/api.js'
import { GameRolesEnum } from '@/utils/constants.js'

const props = defineProps({
  gameId: {
    type: String,
    required: true
  }
})

const rolesData = ref([])

// Порядок смены ролей по кругу
const rolesCycle = [
  GameRolesEnum.civilian,
  GameRolesEnum.sheriff,
  GameRolesEnum.don,
  GameRolesEnum.mafia
]

const cycleRole = (player) => {
  const currentIndex = rolesCycle.indexOf(player.role)
  const nextIndex = (currentIndex + 1) % rolesCycle.length
  player.role = rolesCycle[nextIndex]
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

onMounted(() => {
  loadGameData()
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
