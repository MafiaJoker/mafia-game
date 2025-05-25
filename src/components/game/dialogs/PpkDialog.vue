<template>
  <el-dialog
    v-model="visible"
    title="ППК (Право последнего слова)"
    width="400px"
    :before-close="handleClose"
    >
    <div class="ppk-dialog">
      <el-alert
        title="Право последнего слова"
        description="Выберите результат голосования ППК"
        type="warning"
        :closable="false"
        show-icon
        class="mb-4"
	/>

      <div class="ppk-info mb-4">
        <p>
          <strong>Текущий круг:</strong> {{ gameStore.gameState.round }}
        </p>
        <p>
          <strong>Живых игроков:</strong> {{ alivePlayers.length }}
        </p>
        <p>
          <strong>Мафии в игре:</strong> {{ mafiaCount }}
        </p>
      </div>

      <div class="ppk-actions">
        <h6>Результат ППК:</h6>
        
        <el-space direction="vertical" style="width: 100%">
          <el-button 
            type="danger" 
            size="large"
            style="width: 100%"
            @click="declareCityWin"
            >
            <el-icon><Trophy /></el-icon>
            Победа города
          </el-button>
          
          <el-button 
            type="warning"
            size="large" 
            style="width: 100%"
            @click="declareMafiaWin"
            >
            <el-icon><Sword /></el-icon>
            Победа мафии
          </el-button>
          
          <el-button 
            size="large"
            style="width: 100%"
            @click="handleClose"
            >
            <el-icon><Close /></el-icon>
            Отмена
          </el-button>
        </el-space>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { PLAYER_ROLES } from '@/utils/constants'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { 
      Trophy, 
      Sword, 
      Close 
  } from '@element-plus/icons-vue'

  const gameStore = useGameStore()

  const visible = ref(false)

  const alivePlayers = computed(() => {
      return gameStore.gameState.players.filter(p => p.isAlive && !p.isEliminated)
  })

  const mafiaCount = computed(() => {
      return alivePlayers.value.filter(p => 
	  p.originalRole === PLAYER_ROLES.MAFIA || p.originalRole === PLAYER_ROLES.DON
      ).length
  })

  const show = () => {
      visible.value = true
  }

  const handleClose = () => {
      visible.value = false
  }

  const declareCityWin = async () => {
      try {
	  await ElMessageBox.confirm(
	      'Подтвердите победу города в результате ППК',
	      'Подтверждение',
	      {
		  confirmButtonText: 'Да, город победил',
		  cancelButtonText: 'Отмена',
		  type: 'success'
	      }
	  )

	  // Завершаем игру с победой города
	  await gameStore.finishGame('city_win')
	  
	  ElMessage.success('Игра завершена! Победа мирного города!')
	  handleClose()
	  
      } catch {
	  // Пользователь отменил действие
      }
  }

  const declareMafiaWin = async () => {
      try {
	  await ElMessageBox.confirm(
	      'Подтвердите победу мафии в результате ППК',
	      'Подтверждение',
	      {
		  confirmButtonText: 'Да, мафия победила',
		  cancelButtonText: 'Отмена',
		  type: 'warning'
	      }
	  )

	  // Завершаем игру с победой мафии
	  await gameStore.finishGame('mafia_win')
	  
	  ElMessage.success('Игра завершена! Победа команды мафии!')
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
  .ppk-dialog {
      padding: 8px 0;
  }

  .ppk-info {
      background-color: #f5f7fa;
      padding: 16px;
      border-radius: 4px;
      border-left: 4px solid #409eff;
  }

  .ppk-info p {
      margin: 4px 0;
  }

  .ppk-actions h6 {
      margin: 0 0 16px 0;
      font-weight: 600;
      text-align: center;
  }

  .mb-4 {
      margin-bottom: 16px;
  }
</style>
