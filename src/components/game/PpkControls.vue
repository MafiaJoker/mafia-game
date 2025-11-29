<template>
  <el-dialog
    v-model="visible"
    title="ППК (Победа Противоположной Команде)"
    width="600px"
    :before-close="handleClose"
    >
    <div class="ppk-dialog">
      <el-alert
        title="Выберите игрока, который совершил ППК"
        type="warning"
        :closable="false"
        show-icon
        class="mb-4"
	/>
      
      <div class="players-grid">
        <div 
          v-for="player in alivePlayers"
          :key="player.id"
          class="player-card"
          :class="{ 'selected': selectedPlayer === player.id }"
          @click="selectPlayer(player.id)"
          >
          <div class="player-number">{{ player.id }}</div>
          <div class="player-info">
            <div class="player-name">{{ player.nickname }}</div>
            <div class="player-role">
              <el-tag 
                :type="getRoleTagType(player.originalRole)"
                size="small"
		>
                {{ player.originalRole }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">Отмена</el-button>
        <el-button 
          type="primary" 
          @click="confirmPpk"
          :disabled="!selectedPlayer"
          >
          Подтвердить ППК
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { useGamePhasesStore } from '@/stores/gamePhases'
  import { ElMessage, ElMessageBox } from 'element-plus'

  const props = defineProps({
      modelValue: {
	  type: Boolean,
	  default: false
      }
  })

  const emit = defineEmits(['update:modelValue'])

  const gameStore = useGameStore()
  const gamePhasesStore = useGamePhasesStore()

  const visible = ref(false)
  const selectedPlayer = ref(null)
  
  // Синхронизация с v-model
  watch(() => props.modelValue, (newVal) => {
      visible.value = newVal
      if (newVal) {
          selectedPlayer.value = null
      }
  })
  
  const alivePlayers = computed(() => {
      return gameStore.gameState.players.filter(p => p.isAlive && !p.isEliminated && p.isInGame !== false)
  })
  
  const getRoleTagType = (role) => {
      const types = {
	  'Мирный': 'danger',    // красный
	  'Шериф': 'danger',     // красный
	  'Мафия': undefined,    // черный (default)
	  'Дон': undefined       // черный (default)
      }
      return types[role] || 'info'
  }
  
  const selectPlayer = (playerId) => {
      selectedPlayer.value = playerId
  }

  const handleClose = () => {
      visible.value = false
      emit('update:modelValue', false)
  }
  
  const confirmPpk = async () => {
      if (!selectedPlayer.value) return
      
      try {
	  // Обновляем текущую фазу с ppk_box_id
	  gamePhasesStore.currentPhase.ppk_box_id = selectedPlayer.value
	  await gamePhasesStore.updateCurrentPhaseOnServer()
	  
	  // Синхронизируем статусы игроков с фазами
	  gameStore.syncPlayersWithPhases()
	  
	  // Получаем обновленный статус игры
	  await gameStore.updateGameState()
	  
	  ElMessage.success('ППК зарегистрировано')
	  handleClose()
	  
      } catch (error) {
	  console.error('Ошибка при регистрации ППК:', error)
	  ElMessage.error('Ошибка при регистрации ППК')
      }
  }
</script>

<style scoped>
  .ppk-dialog {
      padding: 8px 0;
  }

  .players-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      max-height: 400px;
      overflow-y: auto;
  }

  .player-card {
      border: 2px solid #dcdfe6;
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 12px;
  }

  .player-card:hover {
      border-color: #409eff;
      background-color: #f0f9ff;
  }

  .player-card.selected {
      border-color: #e6a23c;
      background-color: #fff7e6;
  }

  .player-number {
      font-size: 24px;
      font-weight: bold;
      color: #409eff;
      min-width: 32px;
  }

  .player-info {
      flex: 1;
  }

  .player-name {
      font-weight: 500;
      margin-bottom: 4px;
  }

  .mb-4 {
      margin-bottom: 16px;
  }

  /* Черные теги для мафии и дона */
  :deep(.el-tag:not(.el-tag--danger):not(.el-tag--warning):not(.el-tag--primary):not(.el-tag--success):not(.el-tag--info)) {
      background-color: #606266 !important;
      border-color: #606266 !important;
      color: white !important;
  }
</style>
