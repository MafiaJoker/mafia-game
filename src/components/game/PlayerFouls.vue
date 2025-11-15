<template>
  <div class="player-fouls">
    <div class="fouls-display">
      <el-button
        :type="getFoulsButtonType()"
        :disabled="!canAddFouls"
        size="small"
        round
        @click="handleFoulClick"
        :class="{ 'fouls-maxed': player.fouls >= MAX_FOULS.BEFORE_ELIMINATION }"
	>
        {{ player.fouls }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { MAX_FOULS } from '@/utils/constants'

  const props = defineProps({
      player: {
	  type: Object,
	  required: true
      },
      canAddFouls: {
	  type: Boolean,
	  default: true
      }
  })

  const emit = defineEmits(['increment', 'reset', 'silentNow', 'silentNext', 'eliminate'])

  const showFoulActions = computed(() => {
      return props.player.fouls >= MAX_FOULS.BEFORE_SILENCE
  })

  const getFoulsButtonType = () => {
      if (props.player.fouls >= MAX_FOULS.BEFORE_ELIMINATION) return 'danger'
      if (props.player.fouls >= MAX_FOULS.BEFORE_SILENCE) return 'warning'
      return 'primary'
  }

  const handleFoulClick = () => {
      // Проверяем условия для увеличения фолов
      if (!props.canAddFouls) return
      
      // Разрешаем добавлять фолы до максимума (4 фола)
      if (props.player.fouls < MAX_FOULS.BEFORE_ELIMINATION) {
	  emit('increment', props.player.id)
      }
  }
</script>

<style scoped>
  .player-fouls {
      display: flex;
      flex-direction: column;
      align-items: center;
  }

  .fouls-display {
      margin-bottom: 4px;
  }

  .fouls-maxed {
      animation: pulse 1s infinite;
  }

  @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
  }

  .foul-actions {
      min-width: 120px;
  }

  .mt-2 {
      margin-top: 8px;
  }
</style>
