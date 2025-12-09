<template>
  <el-dialog
    v-model="visible"
    title="Лучший ход"
    width="800px"
  >
    <div class="voting-container">
      <div class="vote-buttons vote-buttons-centered">
        <el-button
          v-for="boxId in totalPlayers"
          :key="boxId"
          :type="isSelected(boxId) ? 'primary' : 'default'"
          size="large"
          @click="togglePlayer(boxId)"
          :disabled="!isSelected(boxId) && selectedCount >= 3"
          :class="[
            'vote-btn',
            'vote-btn-large',
            {
              'vote-btn-selected': isSelected(boxId)
            }
          ]"
        >
          {{ boxId }}
        </el-button>
      </div>
    </div>

    <template #footer>
      <el-button
        type="primary"
        @click="handleAccept"
      >
        Принять лучший ход
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

// Общее количество игроков
const totalPlayers = computed(() => {
  return props.playersData.length
})

// Количество выбранных игроков
const selectedCount = computed(() => {
  return props.phaseData.best_move ? props.phaseData.best_move.length : 0
})

// Проверяет, выбран ли игрок
const isSelected = (boxId) => {
  return props.phaseData.best_move && props.phaseData.best_move.includes(boxId)
}

// Переключает выбор игрока
const togglePlayer = (boxId) => {
  const currentBestMove = props.phaseData.best_move || []
  let updatedBestMove

  if (currentBestMove.includes(boxId)) {
    // Убираем из массива
    updatedBestMove = currentBestMove.filter(id => id !== boxId)
  } else {
    // Добавляем в массив
    updatedBestMove = [...currentBestMove, boxId]
  }

  const updatedPhaseData = {
    ...props.phaseData,
    best_move: updatedBestMove
  }
  emit('update:phaseData', updatedPhaseData)
}

// Принять лучший ход
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
</style>
