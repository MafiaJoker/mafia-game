<template>
  <el-dialog
    v-model="visible"
    title="Удалить игроков"
    width="800px"
  >
    <div class="voting-container">
      <div class="vote-buttons vote-buttons-centered">
        <el-button
          v-for="player in activePlayers"
          :key="player.box_id"
          :type="isSelected(player.box_id) ? 'primary' : 'default'"
          size="large"
          @click="togglePlayer(player.box_id)"
          :class="[
            'vote-btn',
            'vote-btn-large',
            {
              'vote-btn-selected': isSelected(player.box_id)
            }
          ]"
        >
          {{ player.box_id }}
        </el-button>
      </div>
      <div v-if="selectedCount > 0" class="selected-info">
        Выбрано игроков: {{ selectedCount }}
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">
        Отмена
      </el-button>
      <el-button
        type="primary"
        @click="handleAccept"
        :disabled="selectedCount === 0"
      >
        Удалить выбранных игроков
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  playersData: {
    type: Array,
    default: () => []
  },
  phaseData: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'update:phaseData', 'accept'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Только активные игроки (is_in_game = true)
const activePlayers = computed(() => {
  return props.playersData.filter(player => player.is_in_game)
})

// Количество выбранных игроков
const selectedCount = computed(() => {
  return props.phaseData.removed_box_ids ? props.phaseData.removed_box_ids.length : 0
})

// Проверяет, выбран ли игрок
const isSelected = (boxId) => {
  return props.phaseData.removed_box_ids && props.phaseData.removed_box_ids.includes(boxId)
}

// Переключает выбор игрока
const togglePlayer = (boxId) => {
  const currentRemoved = props.phaseData.removed_box_ids || []
  let updatedRemoved

  if (currentRemoved.includes(boxId)) {
    // Убираем из массива
    updatedRemoved = currentRemoved.filter(id => id !== boxId)
  } else {
    // Добавляем в массив
    updatedRemoved = [...currentRemoved, boxId]
  }

  const updatedPhaseData = {
    ...props.phaseData,
    removed_box_ids: updatedRemoved
  }
  emit('update:phaseData', updatedPhaseData)
}

// Принять удаление игроков
const handleAccept = () => {
  emit('accept')
  visible.value = false
}
</script>

<style scoped>
.voting-container {
  padding: 8px 0;
}

.vote-buttons {
  display: flex;
  gap: 0;
  flex-wrap: nowrap;
  justify-content: flex-end;
  flex: 1;
  overflow-x: auto;
}

.vote-btn {
  min-width: 36px;
  padding: 8px 12px;
  margin: 0;
  flex-shrink: 0;
}

.vote-btn + .vote-btn {
  border-left: 1px solid #dcdfe6;
}

.vote-btn.el-button--primary + .vote-btn {
  border-left-color: #409eff;
}

.vote-buttons-centered {
  justify-content: center;
  padding: 20px 0;
}

.vote-btn-large {
  min-width: 50px;
  padding: 12px 16px;
  font-size: 18px;
  font-weight: 600;
}

.selected-info {
  text-align: center;
  margin-top: 16px;
  color: #606266;
  font-size: 14px;
}
</style>
