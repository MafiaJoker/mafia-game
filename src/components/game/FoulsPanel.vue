<template>
  <div class="fouls-panel">
    <div class="fouls-header">Фолы игроков</div>
    <div class="fouls-grid">
      <div
        v-for="player in playersData"
        :key="player.box_id"
        class="foul-item"
        :class="{ 'foul-item-disabled': !player.is_in_game }"
      >
        <span class="foul-player-number">{{ player.box_id }}</span>
        <div
          class="fouls-badge"
          :class="{
            'is-disabled': !player.is_in_game,
            'is-warning': getCurrentFouls(player) > 2
          }"
          @click.stop="handleFoulsClick(player)"
        >
          {{ getCurrentFouls(player) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { apiService } from '@/services/api.js'

const props = defineProps({
  gameId: {
    type: String,
    required: true
  },
  playersData: {
    type: Array,
    required: true
  },
  phaseData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:phaseData'])

// Получает текущее количество фолов для игрока
const getCurrentFouls = (row) => {
  const foulEntry = props.phaseData.fouls_summary?.find(f => f.box_id === row.box_id)
  if (foulEntry) {
    return (row.fouls || 0) + foulEntry.count_fouls
  }
  return row.fouls || 0
}

// Обработчик клика по бейджу фолов
const handleFoulsClick = async (row) => {
  if (!row.is_in_game) return

  const currentFouls = getCurrentFouls(row)
  const initialFouls = row.fouls || 0

  let newTotalFouls
  if (currentFouls === 4) {
    newTotalFouls = initialFouls
  } else {
    newTotalFouls = currentFouls + 1
  }

  const countFouls = newTotalFouls - initialFouls

  const fouls_summary = [...(props.phaseData.fouls_summary || [])]
  const existingIndex = fouls_summary.findIndex(f => f.box_id === row.box_id)

  if (countFouls === 0) {
    if (existingIndex !== -1) {
      fouls_summary.splice(existingIndex, 1)
    }
  } else {
    const foulEntry = {
      box_id: row.box_id,
      count_fouls: countFouls
    }
    if (existingIndex !== -1) {
      fouls_summary[existingIndex] = foulEntry
    } else {
      fouls_summary.push(foulEntry)
    }
  }

  const removed_box_ids = [...(props.phaseData.removed_box_ids || [])]
  if (newTotalFouls === 4) {
    if (!removed_box_ids.includes(row.box_id)) {
      removed_box_ids.push(row.box_id)
    }
  } else {
    const removedIndex = removed_box_ids.indexOf(row.box_id)
    if (removedIndex !== -1) {
      removed_box_ids.splice(removedIndex, 1)
    }
  }

  const updatedPhaseData = {
    ...props.phaseData,
    fouls_summary,
    removed_box_ids
  }
  emit('update:phaseData', updatedPhaseData)

  // Отправляем обновленные фолы на сервер
  try {
    await apiService.patchGamePhase(props.gameId, {
      fouls_summary
    })
  } catch (error) {
    console.error('Failed to patch fouls_summary:', error)
  }
}
</script>

<style scoped>
.fouls-panel {
  margin-bottom: 16px;
}

.fouls-header {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.fouls-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  overflow-x: auto;
}

.foul-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 6px;
  transition: all 0.3s;
  flex-shrink: 0;
  min-width: 70px;
}

.foul-item:hover:not(.foul-item-disabled) {
  background-color: #ecf5ff;
}

.foul-item-disabled {
  opacity: 0.5;
}

.foul-player-number {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
}

.fouls-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background-color: #409eff;
  color: white;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;
}

.fouls-badge:hover:not(.is-disabled) {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.4);
}

.fouls-badge.is-warning {
  background-color: #e6a23c;
}

.fouls-badge.is-warning:hover {
  box-shadow: 0 2px 8px rgba(230, 162, 60, 0.4);
}

.fouls-badge.is-disabled {
  background-color: #dcdfe6;
  color: #909399;
  cursor: not-allowed;
}
</style>
