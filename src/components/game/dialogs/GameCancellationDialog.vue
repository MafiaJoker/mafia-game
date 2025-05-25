<template>
  <el-dialog
    v-model="visible"
    title="Отмена игры"
    width="500px"
    :before-close="handleClose"
    >
    <div class="cancellation-dialog">
      <el-alert
        title="Внимание!"
        description="Отмена игры приведет к завершению текущего процесса. Это действие нельзя отменить."
        type="warning"
        :closable="false"
        show-icon
        class="mb-4"
	/>

      <el-form :model="form" label-width="120px">
        <el-form-item label="Причина отмены" required>
          <el-select 
            v-model="form.reason" 
            placeholder="Выберите причину"
            style="width: 100%"
            >
            <el-option 
              label="Нарушение правил игроком" 
              value="player_misbehavior" 
              />
            <el-option 
              label="Технические проблемы" 
              value="technical_issues" 
              />
            <el-option 
              label="Недостаточно игроков" 
              value="insufficient_players" 
              />
            <el-option 
              label="Другая причина" 
              value="other" 
              />
          </el-select>
        </el-form-item>

        <el-form-item 
          v-if="form.reason === 'player_misbehavior'" 
          label="Номер игрока"
          >
          <el-select 
            v-model="form.playerSlot" 
            placeholder="Выберите игрока"
            style="width: 100%"
            clearable
            >
            <el-option
              v-for="player in gameStore.gameState.players"
              :key="player.id"
              :label="`${player.id}: ${player.name}`"
              :value="player.id"
              />
          </el-select>
        </el-form-item>

        <el-form-item label="Комментарий">
          <el-input
            v-model="form.comment"
            type="textarea"
            :rows="3"
            placeholder="Дополнительная информация (необязательно)"
            />
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="form.withRestart">
            Перерасдача (начать заново с рассадки)
          </el-checkbox>
          <div class="form-text">
            При включении этой опции после отмены можно будет начать новую игру
          </div>
        </el-form-item>
      </el-form>

      <div v-if="form.withRestart" class="restart-info">
        <el-alert
          title="Перерасдача"
          description="После отмены игры будет доступна кнопка для начала новой игры с теми же игроками"
          type="info"
          :closable="false"
          show-icon
          />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">Отмена</el-button>
        <el-button 
          type="danger" 
          @click="confirmCancellation"
          :disabled="!form.reason"
          >
          Отменить игру
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
  import { ref, reactive } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { ElMessage, ElMessageBox } from 'element-plus'

  const gameStore = useGameStore()

  const visible = ref(false)
  const form = reactive({
      reason: '',
      playerSlot: null,
      comment: '',
      withRestart: false
  })

  const show = () => {
      visible.value = true
      Object.assign(form, {
	  reason: '',
	  playerSlot: null,
	  comment: '',
	  withRestart: false
      })
  }

  const handleClose = () => {
      visible.value = false
  }

  const getReasonText = (reason) => {
      const reasons = {
	  'player_misbehavior': 'Нарушение правил игроком',
	  'technical_issues': 'Технические проблемы',
	  'insufficient_players': 'Недостаточно игроков',
	  'other': 'Другая причина'
      }
      return reasons[reason] || reason
  }

  const confirmCancellation = async () => {
      if (!form.reason) {
	  ElMessage.error('Выберите причину отмены')
	  return
      }

      const confirmText = `
    Подтвердите отмену игры:
    
    Причина: ${getReasonText(form.reason)}
    ${form.playerSlot ? `Игрок: ${form.playerSlot}` : ''}
    ${form.comment ? `Комментарий: ${form.comment}` : ''}
    Перерасдача: ${form.withRestart ? 'Да' : 'Нет'}
  `

      try {
	  await ElMessageBox.confirm(
	      confirmText,
	      'Подтверждение отмены игры',
	      {
		  confirmButtonText: 'Да, отменить',
		  cancelButtonText: 'Отмена',
		  type: 'warning'
	      }
	  )

	  // Вызываем метод отмены игры из стора
	  const success = await gameStore.cancelGame(
	      form.reason,
	      form.playerSlot,
	      form.comment,
	      form.withRestart
	  )

	  if (success) {
	      ElMessage.success('Игра отменена')
	      handleClose()
	  } else {
	      ElMessage.error('Ошибка при отмене игры')
	  }

      } catch {
	  // Пользователь отменил действие
      }
  }

  defineExpose({
      show
  })
</script>

<style scoped>
  .cancellation-dialog {
      padding: 8px 0;
  }

  .form-text {
      font-size: 12px;
      color: #909399;
      margin-top: 4px;
  }

  .restart-info {
      margin-top: 16px;
  }

  .mb-4 {
      margin-bottom: 16px;
  }
</style>
