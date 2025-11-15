<template>
  <div class="raise-all-voting">
    <el-alert
      type="warning"
      :closable="false"
      show-icon
      class="mb-4"
    >
      <template #title>
        Повторная перестрелка между игроками: {{ shootoutPlayers.join(', ') }}
      </template>
      <template #default>
        Сколько игроков голосует ЗА ВЫБЫВАНИЕ всех участников перестрелки?
      </template>
    </el-alert>
    
    <div class="voting-buttons">
      <el-button-group>
        <el-button
          :type="selectedVotes === 0 ? 'primary' : 'default'"
          @click="selectVotes(0)"
        >
          0
        </el-button>
        <el-button
          v-for="count in totalPlayers"
          :key="count"
          :type="selectedVotes === count ? 'primary' : 'default'"
          @click="selectVotes(count)"
        >
          {{ count }}
        </el-button>
      </el-button-group>
    </div>
    
    <div v-if="selectedVotes !== null" class="result-info">
      <el-alert
        :type="isMajority ? 'error' : 'success'"
        :closable="false"
        class="mt-4"
      >
        <template #default>
          <strong>{{ selectedVotes }}</strong> из <strong>{{ totalPlayers }}</strong> игроков проголосовало ЗА ВЫБЫВАНИЕ.
          <br>
          Это <strong>{{ isMajority ? 'большинство' : 'не большинство' }}</strong> 
          ({{ isMajority ? '>' : '≤' }} 50%).
          <br>
          <strong>Результат: {{ isMajority ? 'Все участники перестрелки выбывают' : 'Все остаются в игре' }}</strong>
        </template>
      </el-alert>
      
      <div class="confirm-button">
        <el-button type="primary" @click="confirmResult">
          Подтвердить результат
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useGamePhasesStore } from '@/stores/gamePhases'
import { GAME_SUBSTATUS } from '@/utils/constants'
import { ElMessage } from 'element-plus'

const props = defineProps({
  shootoutPlayers: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['complete'])

const gameStore = useGameStore()
const gamePhasesStore = useGamePhasesStore()

const selectedVotes = ref(null)

const totalPlayers = computed(() => {
  return gameStore.gameState.players.filter(p => p.isInGame === true).length
})

const isMajority = computed(() => {
  if (selectedVotes.value === null) return false
  return selectedVotes.value > totalPlayers.value / 2
})

const selectVotes = (count) => {
  selectedVotes.value = count
}

const confirmResult = async () => {
  const eliminateAll = isMajority.value
  
  console.log('confirmResult:', {
    selectedVotes: selectedVotes.value,
    totalPlayers: totalPlayers.value,
    threshold: totalPlayers.value / 2,
    isMajority: isMajority.value,
    eliminateAll,
    shootoutPlayers: props.shootoutPlayers
  })
  
  if (eliminateAll) {
    // Большинство проголосовало ЗА ВЫБЫВАНИЕ - все выбывают
    for (const playerId of props.shootoutPlayers) {
      gameStore.eliminatePlayerByVote(playerId)
    }
    ElMessage.warning(`Выбыли игроки: ${props.shootoutPlayers.join(', ')}`)
    gameStore.gameState.noCandidatesRounds = 0
  } else {
    // Меньшинство проголосовало ЗА - все остаются
    ElMessage.success('Все участники перестрелки остаются в игре')
    gameStore.gameState.noCandidatesRounds++
  }
  
  // Очищаем состояние голосования
  gameStore.gameState.shootoutPlayers = []
  gameStore.gameState.nominatedPlayers = []
  gameStore.gameState.votingResults = {}
  
  // Очищаем номинации у игроков
  gameStore.gameState.players.forEach(p => {
    p.nominated = null
  })
  
  // Отмечаем что голосование прошло
  gameStore.gameState.votingHappenedThisRound = true
  
  // Сохраняем фазу ПЕРЕД проверкой победы
  if (gamePhasesStore.currentPhase) {
    const votedBoxIds = eliminateAll ? [...props.shootoutPlayers] : []
    console.log('Setting voted_box_id:', votedBoxIds, 'eliminateAll:', eliminateAll, 'shootoutPlayers:', props.shootoutPlayers)
    gamePhasesStore.currentPhase.voted_box_id = votedBoxIds
    await gamePhasesStore.updateCurrentPhaseOnServer()
  }
  
  // Проверяем условия победы ПОСЛЕ сохранения фазы
  const victoryResult = gameStore.checkVictoryConditions()
  if (victoryResult) {
    emit('complete')
    return
  }
  
  // Возвращаемся к обсуждению
  if (gameStore.gameState.gameStatus !== 'finished_no_scores' && gameStore.gameState.gameStatus !== 'finished_with_scores') {
    gameStore.setGameStatus(
      gameStore.gameState.gameStatus, 
      gameStore.isCriticalRound ? GAME_SUBSTATUS.CRITICAL_DISCUSSION : GAME_SUBSTATUS.DISCUSSION
    )
  }
  
  // Обновляем состояние игры после завершения голосования
  await gameStore.updateGameState()
  
  emit('complete')
}
</script>

<style scoped>
.raise-all-voting {
  border: 2px solid #e6a23c;
  border-radius: 4px;
  padding: 16px;
  background-color: #fffbf0;
  margin-bottom: 16px;
}

.voting-buttons {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.result-info {
  margin-top: 20px;
}

.confirm-button {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}
</style>