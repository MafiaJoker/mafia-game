<template>
  <div class="player-actions">
    <el-space wrap>
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
          type="info" 
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

  defineEmits(['eliminate', 'reset'])

  const handleEliminate = async () => {
      try {
	  await ElMessageBox.confirm(
	      `Вы уверены, что хотите удалить игрока ${props.player.nickname}?`,
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
