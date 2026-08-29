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
          :pending-fouls="pendingFouls"
          @saved="emit('saved', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import FoulBadges from './FoulBadges.vue'

defineProps({
  gameId: {
    type: String,
    required: true
  },
  playersData: {
    type: Array,
    required: true
  },
  foulTypes: {
    type: Array,
    required: true
  },
  pendingFouls: {
    type: Object,
    required: true
  }
})

// Фолы сохраняет FoulBadges, наружу отдаём состояние игры из ответа сервера
const emit = defineEmits(['saved'])
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

/* Планшет и телефон: десять игроков в два ряда по пять,
   без скрытой горизонтальной прокрутки */
@media (max-width: 1023px) {
  .fouls-grid {
    flex-wrap: wrap;
    overflow: visible;
    gap: 6px;
  }

  .foul-item {
    flex: 1 1 calc(20% - 6px);
    min-width: 0;
  }
}

@media (max-width: 767px) {
  .foul-item {
    padding: 6px 2px;
  }
}
</style>
