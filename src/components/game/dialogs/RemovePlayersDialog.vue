<template>
  <el-dialog
    v-model="visible"
    width="800px"
  >
    <template #header>
      <DialogTimerHeader :title="title" />
    </template>

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
        Удалить выбранных
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import DialogTimerHeader from './DialogTimerHeader.vue'

const props = defineProps({
  modelValue: Boolean,
  playersData: {
    type: Array,
    default: () => []
  },
  phaseData: {
    type: Object,
    default: () => ({})
  },
  title: {
    type: String,
    default: 'Удалить игроков'
  },
  // Половина круга, в которую пишем: день и ночь по-разному двигают счётчик
  // автоничьей, поэтому у них разные поля круга
  phaseField: {
    type: String,
    default: 'removed_box_ids'
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

// Уже выбранные к удалению игроки
const selectedBoxIds = computed(() => props.phaseData[props.phaseField] || [])

// Количество выбранных игроков
const selectedCount = computed(() => selectedBoxIds.value.length)

// Проверяет, выбран ли игрок
const isSelected = (boxId) => selectedBoxIds.value.includes(boxId)

// Переключает выбор игрока
const togglePlayer = (boxId) => {
  const updatedRemoved = isSelected(boxId)
    ? selectedBoxIds.value.filter(id => id !== boxId)
    : [...selectedBoxIds.value, boxId]

  emit('update:phaseData', {
    ...props.phaseData,
    [props.phaseField]: updatedRemoved
  })
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
/* Планшет и телефон: десять кнопок переносятся на вторую строку, а не уходят
   в горизонтальную прокрутку; сами кнопки крупнее - под палец */
@media (max-width: 1023px) {
  .vote-buttons {
    flex-wrap: wrap;
    gap: 8px;
    overflow: visible;
  }

  .vote-btn + .vote-btn {
    border-left: 1px solid var(--el-button-border-color, #dcdfe6);
  }

  .vote-btn-large {
    min-width: 56px;
    height: 48px;
    padding: 8px 12px;
  }
}
</style>
