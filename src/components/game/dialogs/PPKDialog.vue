<template>
  <el-dialog
    v-model="visible"
    title="ППК"
    width="800px"
  >
    <div class="voting-container">
      <div class="vote-buttons vote-buttons-centered">
        <el-button
          v-for="player in activePlayers"
          :key="player.box_id"
          :type="isSelected(player.box_id) ? 'primary' : 'default'"
          size="large"
          @click="selectPlayer(player.box_id)"
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
    </div>

    <template #footer>
      <el-button
        type="primary"
        @click="handleAccept"
        :disabled="!phaseData.ppk_box_id"
      >
        Принять ППК
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

// Проверяет, выбран ли игрок
const isSelected = (boxId) => {
  return props.phaseData.ppk_box_id === boxId
}

// Выбирает игрока (только один может быть выбран)
const selectPlayer = (boxId) => {
  const updatedPhaseData = {
    ...props.phaseData,
    ppk_box_id: boxId
  }
  emit('update:phaseData', updatedPhaseData)
}

// Принять ППК
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
