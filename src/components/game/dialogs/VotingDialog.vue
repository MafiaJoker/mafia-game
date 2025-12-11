<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="800px"
    :before-close="handleClose"
  >
    <div class="voting-container">
      <FoulsPanel
        :players-data="props.playersData"
        :phase-data="props.phaseData"
        @update:phase-data="emit('update:phaseData', $event)"
      />

      <el-divider />

      <!-- Раунды 1 и 2: показываем список игроков -->
      <div v-if="votingRound < 3">
        <div
          v-for="(candidate, index) in currentCandidates"
          :key="candidate.box_id"
          class="candidate-row"
          :class="{ 'candidate-row-locked': !isCandidateAvailable(index) }"
        >
          <div class="candidate-info">
            <el-tooltip content="Номер игрока" placement="top">
              <div class="player-badge">
                <span class="player-label">Игрок</span>
                <span class="box-id">{{ candidate.box_id }}</span>
              </div>
            </el-tooltip>
            <span class="nickname">{{ candidate.nickname }}</span>
          </div>

          <div class="vote-buttons">
            <el-button
              v-for="voteCount in maxVotes"
              :key="voteCount - 1"
              :type="getButtonType(candidate.box_id, voteCount - 1)"
              size="small"
              @click="setVote(candidate.box_id, voteCount - 1)"
              :disabled="!isVoteAvailable(index, candidate.box_id, voteCount - 1)"
              :class="[
                'vote-btn',
                {
                  'vote-btn-selected': isVoteSelected(candidate.box_id, voteCount - 1),
                  'vote-btn-unavailable': !isVoteAvailable(index, candidate.box_id, voteCount - 1)
                }
              ]"
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
      <div v-else>
        <div class="vote-buttons vote-buttons-centered">
          <el-button
            v-for="voteCount in maxVotes"
            :key="voteCount - 1"
            :type="getButtonTypeForAll(voteCount - 1)"
            size="large"
            @click="votesForAll = voteCount - 1"
            :class="[
              'vote-btn',
              'vote-btn-large',
              {
                'vote-btn-selected': isVoteSelectedForAll(voteCount - 1)
              }
            ]"
          >
            {{ voteCount - 1 }}
          </el-button>
        </div>

        <div v-if="showWarning" class="voting-summary">
          <el-divider />
          <el-alert
            title="Все игроки покинут игру"
            type="warning"
            :closable="false"
            show-icon
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
import FoulsPanel from '../FoulsPanel.vue'

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
  return totalVotesAssigned.value > (alivePlayersCount.value / 2)
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

const getLastVotedIndex = () => {
  // Находим ПОСЛЕДНЕГО (самого нижнего) кандидата с голосами > 0
  for (let i = currentCandidates.value.length - 1; i >= 0; i--) {
    const candidate = currentCandidates.value[i]
    if (votes[candidate.box_id] && votes[candidate.box_id] > 0) {
      return i
    }
  }
  return -1
}

const isCandidateAvailable = (index) => {
  const lastVotedIndex = getLastVotedIndex()

  // Если никто не проголосован, все доступны
  if (lastVotedIndex === -1) {
    return true
  }

  // Заблокированы все ВЫШЕ последнего проголосованного
  // Доступны последний проголосованный и все НИЖЕ
  return index >= lastVotedIndex
}

const isVoteSelected = (boxId, voteValue) => {
  const currentVotes = votes[boxId] || 0
  return voteValue <= currentVotes
}

const isVoteAvailable = (index, boxId, voteValue) => {
  // Если кандидат недоступен - все кнопки недоступны
  if (!isCandidateAvailable(index)) {
    return false
  }

  // Считаем сумму голосов, отданных другим кандидатам
  const votesForOthers = Object.entries(votes)
    .filter(([candidateId]) => parseInt(candidateId) !== boxId)
    .reduce((sum, [, count]) => sum + count, 0)

  // Максимум для этого кандидата = всего голосов - голоса других
  const maxAvailable = alivePlayersCount.value - votesForOthers

  return voteValue <= maxAvailable
}

const getButtonType = (boxId, voteValue) => {
  const currentVotes = votes[boxId] || 0

  // Если это выбранное значение - primary
  if (currentVotes === voteValue) {
    return 'primary'
  }

  // Если слева от выбранного и есть выбор - тоже primary
  if (currentVotes > 0 && voteValue < currentVotes) {
    return 'primary'
  }

  return 'default'
}

const getButtonTypeForAll = (voteValue) => {
  // Если это выбранное значение - primary
  if (votesForAll.value === voteValue) {
    return 'primary'
  }

  // Если слева от выбранного и есть выбор - тоже primary
  if (votesForAll.value > 0 && voteValue < votesForAll.value) {
    return 'primary'
  }

  return 'default'
}

const isVoteSelectedForAll = (voteValue) => {
  return voteValue <= votesForAll.value
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
:deep(.el-dialog) {
  z-index: 2000 !important;
}

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

.candidate-row-locked {
  opacity: 0.5;
  pointer-events: none;
  background-color: #f0f0f0 !important;
}

.candidate-info {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex: 0 0 200px;
}

.player-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: help;
}

.player-label {
  font-size: 10px;
  font-weight: 600;
  color: #409eff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.box-id {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #409eff;
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 16px;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.3);
}

.nickname {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  padding-bottom: 6px;
}

.vote-buttons {
  display: flex;
  gap: 0;
  flex-wrap: nowrap;
  justify-content: flex-end;
  flex: 1;
  overflow-x: auto;
}

.vote-btn {
  min-width: 36px;
  padding: 8px 12px;
  margin: 0;
  flex-shrink: 0;
}

.vote-btn + .vote-btn {
  border-left: 1px solid #dcdfe6;
}

.vote-btn.el-button--primary + .vote-btn {
  border-left-color: #409eff;
}

.vote-btn-unavailable {
  opacity: 0.4;
  cursor: not-allowed;
}

.vote-btn-unavailable:hover {
  opacity: 0.4;
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

.vote-buttons-centered {
  justify-content: center;
  padding: 20px 0;
}

.vote-btn-large {
  min-width: 50px;
  padding: 12px 16px;
  font-size: 18px;
  font-weight: 600;
}
</style>
