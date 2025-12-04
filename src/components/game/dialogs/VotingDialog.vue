<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="600px"
    :before-close="handleClose"
  >
    <div class="voting-container">
      <div v-if="currentCandidates.length === 0" class="no-candidates">
        <el-empty description="Нет кандидатов для голосования" />
      </div>

      <!-- Раунды 1 и 2: показываем список игроков -->
      <div v-else-if="votingRound < 3">
        <div v-for="candidate in currentCandidates" :key="candidate.box_id" class="candidate-row">
          <div class="candidate-info">
            <span class="box-id">{{ candidate.box_id }}</span>
            <span class="nickname">{{ candidate.nickname }}</span>
          </div>

          <div class="vote-buttons">
            <el-button
              v-for="voteCount in maxVotes"
              :key="voteCount - 1"
              :type="votes[candidate.box_id] === (voteCount - 1) ? 'primary' : 'default'"
              size="small"
              @click="setVote(candidate.box_id, voteCount - 1)"
              class="vote-btn"
            >
              {{ voteCount - 1 }}
            </el-button>
          </div>
        </div>

        <div class="voting-summary">
          <el-divider />
          <div class="summary-row">
            <span>Распределено голосов:</span>
            <span class="summary-value">{{ totalVotesAssigned }} / {{ alivePlayersCount }}</span>
          </div>
          <div v-if="votingRound > 1" class="summary-row">
            <span>Раунд голосования:</span>
            <span class="summary-value">{{ votingRound }}</span>
          </div>
        </div>
      </div>

      <!-- Раунд 3: голосование за подъем всех кандидатур -->
      <div v-else class="round-three-container">
        <div class="vote-for-all-section">
          <p class="vote-prompt">Выберите количество рук за подъем всех кандидатур:</p>

          <div class="vote-buttons-grid">
            <el-button
              v-for="voteCount in maxVotes"
              :key="voteCount - 1"
              :type="votesForAll === (voteCount - 1) ? 'primary' : 'default'"
              size="large"
              @click="votesForAll = voteCount - 1"
              class="vote-btn-large"
            >
              {{ voteCount - 1 }}
            </el-button>
          </div>

          <el-alert
            v-if="showWarning"
            title="Все игроки покинут игру"
            type="warning"
            :closable="false"
            show-icon
            class="warning-alert"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">Отмена</el-button>
      <el-button
        type="primary"
        @click="handleContinue"
        :disabled="!canContinue"
      >
        Продолжить
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  nominatedPlayers: {
    type: Array,
    default: () => []
  },
  playersData: {
    type: Array,
    default: () => []
  },
  phaseData: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'update:phaseData', 'update:nominatedPlayers', 'voting-completed'])

const votes = reactive({})
const votingRound = ref(1)
const currentCandidates = ref([])
const previousTiedPlayers = ref([])
const votesForAll = ref(0)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const dialogTitle = computed(() => {
  if (votingRound.value === 1) {
    return 'Голосование'
  } else if (votingRound.value === 2) {
    return 'Перестрелка'
  } else {
    return 'Голосование за подъем всех кандидатур'
  }
})

const alivePlayersCount = computed(() => {
  return props.playersData.filter(p => p.is_in_game).length
})

const maxVotes = computed(() => alivePlayersCount.value + 1)

const totalVotesAssigned = computed(() => {
  return Object.values(votes).reduce((sum, count) => sum + count, 0)
})

const canContinue = computed(() => {
  if (votingRound.value === 3) {
    return true // Для 3-го раунда можно всегда продолжить
  }
  return totalVotesAssigned.value === alivePlayersCount.value
})

const showWarning = computed(() => {
  if (votingRound.value === 3) {
    const halfAlivePlayers = Math.floor(alivePlayersCount.value / 2)
    return votesForAll.value > halfAlivePlayers
  }
  return false
})

const setVote = (boxId, count) => {
  votes[boxId] = count
}

const getCandidateData = (boxId) => {
  return props.playersData.find(p => p.box_id === boxId)
}

const findWinners = () => {
  const voteCounts = Object.entries(votes).map(([boxId, count]) => ({
    boxId: parseInt(boxId),
    count
  }))

  if (voteCounts.length === 0) return []

  const maxVoteCount = Math.max(...voteCounts.map(v => v.count))

  if (maxVoteCount === 0) return []

  return voteCounts.filter(v => v.count === maxVoteCount)
}

const addToVotedBoxIds = (boxIds) => {
  const updatedPhaseData = {
    ...props.phaseData,
    voted_box_ids: [...(props.phaseData.voted_box_ids || []), ...boxIds]
  }
  emit('update:phaseData', updatedPhaseData)
}

const handleContinue = () => {
  const winners = findWinners()

  if (votingRound.value === 1) {
    // Первый раунд голосования
    if (winners.length === 1) {
      // Есть однозначный победитель
      addToVotedBoxIds([winners[0].boxId])
      handleClose()
      emit('voting-completed')
    } else if (winners.length > 1) {
      // Ничья - переходим к перестрелке
      votingRound.value = 2
      previousTiedPlayers.value = winners.map(w => w.boxId)
      currentCandidates.value = winners.map(w => getCandidateData(w.boxId))

      // Обновляем список номинированных - оставляем только тех, кто в перестрелке
      emit('update:nominatedPlayers', previousTiedPlayers.value)

      // Сбрасываем голоса
      Object.keys(votes).forEach(key => delete votes[key])
      currentCandidates.value.forEach(c => votes[c.box_id] = 0)
    }
  } else if (votingRound.value === 2) {
    // Второй раунд (перестрелка)
    if (winners.length === 1) {
      // Есть однозначный победитель перестрелки
      addToVotedBoxIds([winners[0].boxId])
      handleClose()
      emit('voting-completed')
    } else if (winners.length > 1) {
      // Снова ничья между теми же игроками
      const currentTiedPlayers = winners.map(w => w.boxId)
      const samePlayersAsBefore =
        currentTiedPlayers.length === previousTiedPlayers.value.length &&
        currentTiedPlayers.every(id => previousTiedPlayers.value.includes(id))

      if (samePlayersAsBefore) {
        // Голосование за подъем всех кандидатур
        votingRound.value = 3
        Object.keys(votes).forEach(key => delete votes[key])
        votesForAll.value = 0
      } else {
        // Новая комбинация игроков - продолжаем перестрелку
        previousTiedPlayers.value = currentTiedPlayers
        currentCandidates.value = winners.map(w => getCandidateData(w.boxId))
        emit('update:nominatedPlayers', previousTiedPlayers.value)
        Object.keys(votes).forEach(key => delete votes[key])
        currentCandidates.value.forEach(c => votes[c.box_id] = 0)
      }
    }
  } else if (votingRound.value === 3) {
    // Голосование за подъем всех кандидатур
    const halfAlivePlayers = Math.floor(alivePlayersCount.value / 2)

    if (votesForAll.value > halfAlivePlayers) {
      // Если строго больше половины голосов - все игроки покидают игру
      const allCandidateIds = currentCandidates.value.map(c => c.box_id)
      addToVotedBoxIds(allCandidateIds)
    }
    emit('voting-completed')

    handleClose()
  }
}

const handleClose = () => {
  visible.value = false
  resetVoting()
}
// TODO
// 1) Визуально сделать красивее голосовалку
// 2) В правом верхнем углу по умолчанию должна быть кнопка ночь и превращаться в начать голосование только если есть выставленные кандидаты
// 3) Если phase_id=1 то при одной выставленной кандидатуре кнопка Начать голосование не появляется
// 4) Если phase_id>1 при нажатии Начать голосование модальное окно не появляется и пользователь автоматически заголосовывается
// 5) После голосования в колонке выставления должны пропасть кнопки "выставить", а на против заголосованных игроков надпись "покинул игру"
const resetVoting = () => {
  votingRound.value = 1
  Object.keys(votes).forEach(key => delete votes[key])
  previousTiedPlayers.value = []
  currentCandidates.value = []
  votesForAll.value = 0
}

// Инициализация при открытии диалога
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    resetVoting()

    // Получаем данные кандидатов
    currentCandidates.value = props.nominatedPlayers
      .map(boxId => getCandidateData(boxId))
      .filter(player => player !== undefined)

    // Инициализируем голоса
    currentCandidates.value.forEach(candidate => {
      votes[candidate.box_id] = 0
    })
  }
})
</script>

<style scoped>
.voting-container {
  padding: 8px 0;
}

.no-candidates {
  padding: 20px 0;
}

.candidate-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 8px;
  background-color: #f5f7fa;
  border-radius: 6px;
  transition: all 0.3s;
}

.candidate-row:hover {
  background-color: #ecf5ff;
}

.candidate-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 200px;
}

.box-id {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: #409eff;
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 14px;
}

.nickname {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.vote-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex: 1;
}

.vote-btn {
  min-width: 36px;
  padding: 8px 12px;
}

.voting-summary {
  margin-top: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #606266;
}

.summary-value {
  font-weight: 600;
  color: #303133;
}

.round-three-container {
  padding: 16px 0;
}

.vote-for-all-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.vote-prompt {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin: 0;
  text-align: center;
}

.vote-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  gap: 12px;
  padding: 0 16px;
}

.vote-btn-large {
  height: 48px;
  font-size: 18px;
  font-weight: 600;
}

.warning-alert {
  margin-top: 8px;
}
</style>
