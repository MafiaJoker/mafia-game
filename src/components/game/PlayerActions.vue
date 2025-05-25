<template>
  <div class="player-actions">
    <el-space wrap>
      <!-- Кнопки молчания при 3 фолах -->
      <template v-if="player.fouls === MAX_FOULS.BEFORE_SILENCE && !player.isSilent && !player.silentNextRound">
        <el-button 
          type="warning" 
          size="small"
          @click="$emit('silentNow', player.id)"
          >
          Молчит сейчас
        </el-button>
        
        <el-button 
          type="info" 
          size="small"
          @click="$emit('silentNext', player.id)"
          >
          След. круг
        </el-button>
      </template>
      
      <!-- Кнопки при 4+ фолах -->
      <template v-if="player.fouls >= MAX_FOULS.BEFORE_ELIMINATION && !player.isEliminated">
        <el-button 
          type="danger" 
          size="small"
          @click="handleEliminate"
          >
          <el-icon><Delete /></el-icon>
        </el-button>
        
        <el-button 
          type="secondary" 
          size="small"
          @click="$emit('reset', player.id)"
          >
          <el-icon><RefreshLeft /></el-icon>
        </el-button>
      </template>
    </el-space>
  </div>
</template>

<script setup>
  import { ElMessageBox } from 'element-plus'
  import { MAX_FOULS } from '@/utils/constants'
  import { Delete, RefreshLeft } from '@element-plus/icons-vue'

  const props = defineProps({
      player: {
	  type: Object,
	  required: true
      }
  })

  defineEmits(['silentNow', 'silentNext', 'eliminate', 'reset'])

  const handleEliminate = async () => {
      try {
	  await ElMessageBox.confirm(
	      `Вы уверены, что хотите удалить игрока ${props.player.name}?`,
	      'Подтверждение',
	      {
		  confirmButtonText: 'Да',
		  cancelButtonText: 'Отмена',
		  type: 'warning'
	      }
	  )
	  
	  $emit('eliminate', props.player.id)
      } catch {
	  // Отмена
      }
  }
</script>

<style scoped>
  .player-actions {
      display: flex;
      justify-content: center;
  }
</style>
