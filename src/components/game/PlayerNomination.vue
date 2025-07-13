<template>
  <div class="player-nomination">
    <!-- Показываем селект только в фазе обсуждения для живых игроков -->
    <el-select
      v-if="canNominate"
      :model-value="player.nominated"
      placeholder="Выберите игрока"
      size="small"
      clearable
      @change="handleNomination"
      style="width: 100%"
      >
      <el-option
        v-for="target in availableTargets"
        :key="target.id"
        :label="`${target.id}: ${target.nickname}`"
        :value="target.id"
	/>
    </el-select>
    
    <!-- Показываем выбранную номинацию в остальных случаях -->
    <div v-else-if="player.nominated" class="nomination-display">
      <el-tag type="warning">
        {{ getNominatedPlayerName(player.nominated) }}
      </el-tag>
    </div>
    
    <!-- Пустое состояние -->
    <div v-else class="no-nomination">
      —
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { GAME_STATUSES, GAME_SUBSTATUS } from '@/utils/constants'

  const props = defineProps({
      player: {
	  type: Object,
	  required: true
      },
      players: {
	  type: Array,
	  required: true
      },
      gameState: {
	  type: Object,
	  required: true
      }
  })

  const emit = defineEmits(['nominate'])

  const canNominate = computed(() => {
      return props.player.isAlive && 
          !props.player.isEliminated &&
          props.gameState.gameStatus === GAME_STATUSES.IN_PROGRESS &&
          (props.gameState.gameSubstatus === GAME_SUBSTATUS.DISCUSSION ||
	   props.gameState.gameSubstatus === GAME_SUBSTATUS.CRITICAL_DISCUSSION)
  })

  const availableTargets = computed(() => {
      if (!canNominate.value) return []
      
      const nominatedPlayerIds = props.gameState.players
	    .filter(p => p.isAlive && !p.isEliminated && p.nominated !== null)
	    .map(p => p.nominated)
      
      return props.players.filter(p => {
	  // Может номинировать себя
	  if (p.id === props.player.id) return true
	  
	  // Может номинировать живых игроков, которые еще не номинированы
	  // или которых номинировал именно этот игрок
	  return p.isAlive && 
	      !p.isEliminated && 
	      (!nominatedPlayerIds.includes(p.id) || p.id === props.player.nominated)
      })
  })

  const getNominatedPlayerName = (playerId) => {
      const nominatedPlayer = props.players.find(p => p.id === playerId)
      return nominatedPlayer ? `${nominatedPlayer.id}: ${nominatedPlayer.nickname}` : `Игрок ${playerId}`
  }

  const handleNomination = (targetId) => {
      emit('nominate', props.player.id, targetId)
  }
</script>

<style scoped>
  .nomination-display {
      display: flex;
      justify-content: center;
  }

  .no-nomination {
      text-align: center;
      color: #c0c4cc;
      font-style: italic;
  }
</style>
