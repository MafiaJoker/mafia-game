<template>
  <div v-if="showPpk" class="ppk-controls">
    <el-alert
      title="ППК (Право последнего слова)"
      description="Выберите результат голосования ППК"
      type="warning"
      :closable="false"
      show-icon
      class="mb-3"
      />

    <div class="ppk-actions">
      <el-space>
        <el-button type="info" @click="handleCancel">
          <el-icon><Close /></el-icon>
          Отменить
        </el-button>
        
        <el-button type="danger" @click="declareMafiaWin">
          <el-icon><Aim /></el-icon>
          Победа мафии
        </el-button>
        
        <el-button type="success" @click="declareCityWin">
          <el-icon><Trophy /></el-icon>
          Победа города
        </el-button>
      </el-space>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { 
      Close, 
      Aim, 
      Trophy 
  } from '@element-plus/icons-vue'

  const props = defineProps({
      modelValue: {
	  type: Boolean,
	  default: false
      }
  })

  const emit = defineEmits(['update:modelValue'])

  const gameStore = useGameStore()

  const showPpk = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
  })

  const handleCancel = () => {
      showPpk.value = false
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
	  
	  // ElMessage.success('Игра завершена! Победа мирного города!')
	  showPpk.value = false
	  
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
	  
	  // ElMessage.success('Игра завершена! Победа команды мафии!')
	  showPpk.value = false
	  
      } catch {
	  // Пользователь отменил действие
      }
  }
</script>

<style scoped>
  .ppk-controls {
      padding: 16px;
      background-color: #fff7e6;
      border: 2px solid #e6a23c;
      border-radius: 8px;
      margin-top: 16px;
  }

  .ppk-actions {
      margin-top: 16px;
      text-align: center;
  }

  .mb-3 {
      margin-bottom: 12px;
  }
</style>
