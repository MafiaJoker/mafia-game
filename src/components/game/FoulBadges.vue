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
import { apiService } from '@/services/api.js'

const props = defineProps({
  gameId: {
    type: String,
    required: true
  },
  // Игрок из состояния игры: box_id, is_in_game, fouls: [{ type, count }] на начало круга
  player: {
    type: Object,
    required: true
  },
  // Типы фолов системы правил: [{ foul_type, removal_threshold }]
  foulTypes: {
    type: Array,
    required: true
  },
  // Дельта фолов текущей фазы: [{ box_id, count_fouls, type }]
  foulsSummary: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update:foulsSummary', 'saved'])

// Фолы игрока на начало круга (из состояния игры)
const getInitialFouls = (type) => {
  return props.player.fouls?.find(f => f.type === type)?.count || 0
}

// Фолы, добавленные в текущей фазе
const getPhaseDelta = (type) => {
  const entry = props.foulsSummary.find(
    f => f.box_id === props.player.box_id && f.type === type
  )
  return entry?.count_fouls || 0
}

const getCurrentFouls = (type) => {
  return getInitialFouls(type) + getPhaseDelta(type)
}

// Выбывшему по фолам оставляем возможность откатить фолы текущей фазы
const isClickable = (type) => {
  return props.player.is_in_game || getPhaseDelta(type) > 0
}

const isWarning = (foulType) => {
  return getCurrentFouls(foulType.foul_type) >= foulType.removal_threshold - 1
}

const handleClick = async (foulType) => {
  const type = foulType.foul_type
  if (!isClickable(type)) return

  const initialFouls = getInitialFouls(type)
  const currentFouls = getCurrentFouls(type)

  // По достижении порога клик сбрасывает фолы, добавленные в этой фазе
  const newTotalFouls = currentFouls >= foulType.removal_threshold
    ? initialFouls
    : currentFouls + 1
  const countFouls = newTotalFouls - initialFouls

  const foulsSummary = props.foulsSummary.filter(
    f => !(f.box_id === props.player.box_id && f.type === type)
  )
  if (countFouls > 0) {
    foulsSummary.push({
      box_id: props.player.box_id,
      count_fouls: countFouls,
      type
    })
  }
  emit('update:foulsSummary', foulsSummary)

  // Отправляем обновленные фолы на сервер
  try {
    await apiService.patchGamePhase(props.gameId, {
      fouls_summary: foulsSummary
    })
    emit('saved')
  } catch (error) {
    console.error('Failed to patch fouls_summary:', error)
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
