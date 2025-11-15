<template>
  <div class="player-nominate-button">
    <!-- Кнопка "Выставить" для живых игроков -->
    <div v-if="canNominate" class="nominate-controls">
      <el-button
        v-if="!isNominated"
        type="warning"
        size="small"
        @click="handleNominate"
        >
        Выставить
      </el-button>
      <div v-else class="nominated-controls">
        <el-tag type="warning" size="small" closable @close="handleRemoveNomination">
          #{{ nominationOrder }}
        </el-tag>
      </div>
    </div>
    
    <!-- Показываем статус для мертвых игроков -->
    <div v-else class="nomination-status">
      <el-tag v-if="isNominated" type="warning" size="small">
        #{{ nominationOrder }}
      </el-tag>
      <span v-else class="no-nomination">—</span>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { GAME_STATUSES, GAME_SUBSTATUS } from '@/utils/constants'
  import { useGameStore } from '@/stores/game'

  const gameStore = useGameStore()

  const props = defineProps({
      player: {
          type: Object,
          required: true
      },
      gameState: {
          type: Object,
          required: true
      }
  })

  const emit = defineEmits(['nominate', 'remove-nomination'])

  const canNominate = computed(() => {
      return props.player.isAlive && 
          !props.player.isEliminated &&
          props.player.isInGame !== false &&
          !gameStore.hasVotingInCurrentPhase &&
          props.gameState.gameStatus === GAME_STATUSES.IN_PROGRESS &&
          (props.gameState.gameSubstatus === GAME_SUBSTATUS.DISCUSSION ||
           props.gameState.gameSubstatus === GAME_SUBSTATUS.CRITICAL_DISCUSSION)
  })

  const isNominated = computed(() => {
      // Проверяем, выставлен ли этот игрок в nominatedPlayers
      return gameStore.gameState.nominatedPlayers.includes(props.player.id)
  })

  const nominationOrder = computed(() => {
      // Возвращаем порядковый номер в списке номинантов
      const index = gameStore.gameState.nominatedPlayers.indexOf(props.player.id)
      return index !== -1 ? index + 1 : null
  })

  const handleNominate = () => {
      if (!isNominated.value) {
          emit('nominate', props.player.id)
      }
  }

  const handleRemoveNomination = () => {
      emit('remove-nomination', props.player.id)
  }
</script>

<style scoped>
  .nominate-controls {
      display: flex;
      justify-content: center;
  }

  .nominated-controls {
      display: flex;
      justify-content: center;
  }

  .nomination-status {
      display: flex;
      justify-content: center;
  }

  .no-nomination {
      text-align: center;
      color: #c0c4cc;
      font-style: italic;
  }
</style>