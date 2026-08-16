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
        <FoulBadges
          :game-id="gameId"
          :player="player"
          :foul-types="foulTypes"
          :fouls-summary="phaseData.fouls_summary || []"
          @update:fouls-summary="handleFoulsSummaryUpdate"
          @saved="emit('saved')"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import FoulBadges from './FoulBadges.vue'

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
  },
  foulTypes: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update:phaseData', 'saved'])

const handleFoulsSummaryUpdate = (foulsSummary) => {
  emit('update:phaseData', {
    ...props.phaseData,
    fouls_summary: foulsSummary
  })
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
</style>
