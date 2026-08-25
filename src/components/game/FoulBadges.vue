<template>
  <div class="foul-badges">
    <el-tooltip
      v-for="foulType in foulTypes"
      :key="foulType.foul_type"
      :content="foulType.foul_type"
      placement="top"
    >
      <div
        class="foul-badge"
        :class="[
          `foul-badge--${foulType.foul_type}`,
          {
            'is-disabled': !isClickable(foulType.foul_type),
            'is-warning': isWarning(foulType)
          }
        ]"
        @click.stop="handleClick(foulType)"
      >
        <span class="foul-badge-count">{{ getCurrentFouls(foulType.foul_type) }}</span>
        <span class="foul-badge-letter">{{ foulType.foul_type[0] }}</span>
      </div>
    </el-tooltip>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/services/api.js'

const props = defineProps({
  gameId: {
    type: String,
    required: true
  },
  // Игрок из состояния игры: box_id, is_in_game, fouls: [{ type, count }] — итог за игру
  player: {
    type: Object,
    required: true
  },
  // Типы фолов системы правил: [{ foul_type, removal_threshold }]
  foulTypes: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['saved'])

// Отправленные, но ещё не подтверждённые сервером значения: type -> count
const pendingFouls = reactive({})
// Номер последнего запроса по типу фола: ответы более ранних запросов устарели
const lastRequests = {}
let requestSeq = 0

// Фолы игрока за игру из состояния игры
const getSavedFouls = (type) => {
  return props.player.fouls?.find(f => f.type === type)?.count || 0
}

const getCurrentFouls = (type) => {
  return pendingFouls[type] ?? getSavedFouls(type)
}

// Выбывшему по фолам оставляем возможность откатить фолы
const isClickable = (type) => {
  return props.player.is_in_game || getCurrentFouls(type) > 0
}

const isWarning = (foulType) => {
  return getCurrentFouls(foulType.foul_type) >= foulType.removal_threshold - 1
}

const handleClick = async (foulType) => {
  const type = foulType.foul_type
  if (!isClickable(type)) return

  // Карусель по итогу за игру: 0 → 1 → … → порог → 0
  const count = (getCurrentFouls(type) + 1) % (foulType.removal_threshold + 1)

  // Показываем новое значение сразу, чтобы следующий клик считался от него,
  // не дожидаясь ответа сервера
  pendingFouls[type] = count
  const seq = ++requestSeq
  lastRequests[type] = seq

  // Отправляем итоговое количество фолов на сервер
  try {
    const gameState = await apiService.updateGameFouls(props.gameId, [
      { box_id: props.player.box_id, type, count }
    ])
    // Состояние игры применяет только последний запрос по этому типу фола
    if (lastRequests[type] !== seq) return
    emit('saved', gameState)
    delete pendingFouls[type]
  } catch (error) {
    console.error('Failed to update fouls:', error)
    if (lastRequests[type] !== seq) return
    // Возвращаем сохранённое значение: сервер фолы не изменил
    delete pendingFouls[type]
    ElMessage.error('Не удалось изменить фолы')
  }
}
</script>

<style scoped>
.foul-badges {
  display: inline-flex;
  gap: 4px;
}

.foul-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  color: white;
  border-radius: 12px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;
}

.foul-badge--regular {
  background-color: #409eff;
}

.foul-badge--tech {
  background-color: #9254de;
}

.foul-badge-letter {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.75;
  text-transform: lowercase;
}

.foul-badge:hover:not(.is-disabled) {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.foul-badge.is-warning {
  background-color: #e6a23c;
}

.foul-badge.is-disabled {
  background-color: #dcdfe6;
  color: #909399;
  cursor: not-allowed;
}
</style>
