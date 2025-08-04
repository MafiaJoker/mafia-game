<template>
  <el-dialog
    v-model="visible"
    title="Удаление игрока"
    width="600px"
    :before-close="handleClose"
    >
    <div class="elimination-dialog">
      <el-alert
        title="Выберите игрока для удаления из игры"
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
      
      <div v-if="selectedPlayer" class="elimination-reason mt-4">
        <h6>Причина удаления:</h6>
        <el-radio-group v-model="eliminationReason">
          <el-radio value="foul_limit">Превышение лимита фолов</el-radio>
          <el-radio value="misbehavior">Нарушение правил</el-radio>
          <el-radio value="technical">Технические причины</el-radio>
          <el-radio value="other">Другое</el-radio>
        </el-radio-group>
        
        <el-input
          v-if="eliminationReason === 'other'"
          v-model="customReason"
          placeholder="Укажите причину"
          class="mt-2"
          />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">Отмена</el-button>
        <el-button 
          type="danger" 
          @click="confirmElimination"
          :disabled="!selectedPlayer"
          >
          Удалить игрока
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { ElMessage, ElMessageBox } from 'element-plus'

  const gameStore = useGameStore()

  const visible = ref(false)
  const selectedPlayer = ref(null)
  const eliminationReason = ref('foul_limit')
  const customReason = ref('')

  const alivePlayers = computed(() => {
      return gameStore.gameState.players.filter(p => p.isAlive && !p.isEliminated)
  })

  const getRoleTagType = (role) => {
      const types = {
	  'Мирный': 'success',
	  'Шериф': 'primary',
	  'Мафия': 'danger',
	  'Дон': 'warning'
      }
      return types[role] || 'info'
  }

  const show = () => {
      visible.value = true
      selectedPlayer.value = null
      eliminationReason.value = 'foul_limit'
      customReason.value = ''
  }

  const handleClose = () => {
      visible.value = false
  }

  const selectPlayer = (playerId) => {
      selectedPlayer.value = playerId
  }

  const confirmElimination = async () => {
      if (!selectedPlayer.value) return

      const player = gameStore.currentPlayer(selectedPlayer.value)
      
      try {
	  await ElMessageBox.confirm(
	      `Вы уверены, что хотите удалить игрока ${player.nickname}?`,
	      'Подтверждение удаления',
	      {
		  confirmButtonText: 'Да, удалить',
		  cancelButtonText: 'Отмена',
		  type: 'warning'
	      }
	  )

	  gameStore.eliminatePlayer(selectedPlayer.value)
	  
	  // ElMessage.success(`Игрок ${player.nickname} удален из игры`)
	  handleClose()
	  
      } catch {
	  // Пользователь отменил действие
      }
  }

  defineExpose({
      show
  })
</script>

<style scoped>
  .elimination-dialog {
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
      border-color: #f56c6c;
      background-color: #fef0f0;
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

  .elimination-reason h6 {
      margin: 0 0 8px 0;
      font-weight: 600;
  }

  .mt-2 {
      margin-top: 8px;
  }

  .mt-4 {
      margin-top: 16px;
  }

  .mb-4 {
      margin-bottom: 16px;
  }
</style>
