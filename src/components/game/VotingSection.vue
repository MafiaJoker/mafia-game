<template>
  <div class="voting-section mb-4">
      <!-- Кандидаты -->
      <div class="candidates-section mb-4">
        <div v-if="nominatedPlayers.length === 0" class="no-candidates">
          <el-empty description="Нет кандидатур для голосования" />
        </div>
        
        <div v-else class="candidates-list">
          <div 
            v-for="playerId in nominatedPlayers" 
            :key="playerId"
            class="candidate-item"
            >
            <div class="candidate-header">
              <span class="candidate-number">{{ playerId }}</span>
            </div>
            
            <div class="voting-buttons">
              <el-button-group>
                <el-button 
                  :type="getVoteButtonType(playerId, 0)"
                  size="small"
                  @click="registerVote(playerId, 0)"
                  >
                  0
                </el-button>
                <el-button 
                  v-for="votes in getAvailableVotes(playerId)"
                  :key="votes"
                  :type="getVoteButtonType(playerId, votes)"
                  size="small"
                  @click="registerVote(playerId, votes)"
                  >
                  {{ votes }}
                </el-button>
              </el-button-group>
            </div>
          </div>
        </div>
      </div>

      <!-- Результаты голосования -->
      <div v-if="hasVotes" class="results-section">
        <div class="results-list">
          <div 
            v-for="[playerId, votes] in votingResults" 
            :key="playerId"
            class="result-item"
            >
            <span class="result-player">
              {{ playerId }}: {{ getPlayerName(parseInt(playerId)) }}
            </span>
            <el-tag type="primary" size="small">
              {{ votes }} {{ getVoteNoun(votes) }}
            </el-tag>
          </div>
        </div>
        
        <div class="votes-summary">
          <el-tag type="info" effect="plain" size="small">
            Осталось голосов: {{ remainingVotes }}
          </el-tag>
        </div>
      </div>

      <!-- Сообщения о перестрелке -->
      <div v-if="shootoutMessage" class="shootout-message">
        <el-alert 
          :title="shootoutMessage"
          type="warning"
          :closable="false"
          show-icon
          />
      </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { useVotingStore } from '@/stores/voting'
  import { Checked } from '@element-plus/icons-vue'

  const gameStore = useGameStore()
  const votingStore = useVotingStore()

  const nominatedPlayers = computed(() => gameStore.gameState.nominatedPlayers)
  const votingResults = computed(() => {
      return Object.entries(gameStore.gameState.votingResults)
	  .filter(([_, votes]) => votes > 0)
  })

  const hasVotes = computed(() => votingResults.value.length > 0)

  const alivePlayers = computed(() => {
      return gameStore.gameState.players.filter(p => p.isAlive && !p.isEliminated).length
  })

  const usedVotes = computed(() => {
      return Object.values(gameStore.gameState.votingResults).reduce((sum, votes) => sum + votes, 0)
  })

  const remainingVotes = computed(() => alivePlayers.value - usedVotes.value)

  const shootoutMessage = computed(() => {
      if (gameStore.gameState.shootoutPlayers.length > 0) {
	  const players = gameStore.gameState.shootoutPlayers
		.map(id => `${id}: ${getPlayerName(id)}`)
		.join(', ')
	  return `Перестрелка между игроками: ${players}`
      }
      return null
  })

  const getPlayerName = (playerId) => {
      const player = gameStore.currentPlayer(playerId)
      return player ? player.nickname : `Игрок ${playerId}`
  }

  const getVoteButtonType = (playerId, votes) => {
      const currentVotes = gameStore.gameState.votingResults[playerId]
      return currentVotes === votes ? 'primary' : 'info'
  }

  const getAvailableVotes = (playerId) => {
      const currentVotes = gameStore.gameState.votingResults[playerId] || 0
      const maxVotes = remainingVotes.value + currentVotes
      
      const votes = []
      for (let i = 1; i <= maxVotes; i++) {
	  votes.push(i)
      }
      return votes
  }

  const getVoteNoun = (count) => {
      const n = Math.abs(count) % 100
      if (n >= 5 && n <= 20) return 'голосов'
      
      const lastDigit = n % 10
      if (lastDigit === 1) return 'голос'
      if (lastDigit >= 2 && lastDigit <= 4) return 'голоса'
      return 'голосов'
  }

  const registerVote = (playerId, votes) => {
      votingStore.registerVotes(playerId, votes)
  }
</script>

<style scoped>
  .voting-section {
      border: 1px solid #e6a23c;
      border-radius: 4px;
      padding: 8px;
      background-color: #fefefe;
  }

  .no-candidates {
      text-align: center;
      padding: 16px 0;
  }

  .candidates-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
  }

  .candidate-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
      border-bottom: 1px solid #e4e7ed;
      background-color: transparent;
  }

  .candidate-header {
      display: flex;
      align-items: center;
      gap: 8px;
  }

  .candidate-number {
      font-weight: bold;
      font-size: 18px;
      color: #409eff;
  }

  .candidate-name {
      font-weight: 500;
  }

  .voting-buttons {
      display: flex;
      justify-content: center;
  }

  .results-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
  }

  .result-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
  }

  .result-player {
      font-weight: 500;
  }

  .votes-summary {
      text-align: center;
      padding-top: 8px;
      border-top: 1px solid #ebeef5;
  }

  .shootout-message {
      margin-top: 16px;
  }

  .mb-4 {
      margin-bottom: 8px;
  }
</style>
