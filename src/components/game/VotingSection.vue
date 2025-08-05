<template>
  <div class="voting-section mb-4">
      <!-- Голосование за поднятие всех при повторной перестрелке -->
      <RaiseAllVoting 
        v-if="showRaiseAllVoting"
        :shootout-players="gameStore.gameState.shootoutPlayers"
        @complete="handleRaiseAllComplete"
      />
      
      <!-- Обычное голосование -->
      <template v-else>
        <!-- Кандидаты -->
        <div class="candidates-section mb-4">
          <div v-if="nominatedPlayers.length > 0" class="candidates-list">
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
      </template>
  </div>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { useVotingStore } from '@/stores/voting'
  import RaiseAllVoting from './RaiseAllVoting.vue'
  import { Checked } from '@element-plus/icons-vue'

  const gameStore = useGameStore()
  const votingStore = useVotingStore()
  
  const showRaiseAllVoting = ref(false)
  
  // Проверяем нужно ли показать голосование за поднятие всех
  const needsRaiseAllVoting = computed(() => {
    // Если есть shootoutPlayers и нет обычных номинаций - показываем голосование за поднятие
    return gameStore.gameState.shootoutPlayers.length > 0 && 
           gameStore.gameState.nominatedPlayers.length === 0
  })
  
  watch(needsRaiseAllVoting, (needs) => {
    showRaiseAllVoting.value = needs
  })

  const nominatedPlayers = computed(() => gameStore.gameState.nominatedPlayers)

  const alivePlayers = computed(() => {
      return gameStore.gameState.players.filter(p => p.isInGame === true).length
  })

  const usedVotes = computed(() => {
      return Object.values(gameStore.gameState.votingResults).reduce((sum, votes) => sum + votes, 0)
  })

  const remainingVotes = computed(() => alivePlayers.value - usedVotes.value)



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


  const registerVote = (playerId, votes) => {
      votingStore.registerVotes(playerId, votes)
  }
  
  const handleRaiseAllComplete = () => {
      showRaiseAllVoting.value = false
  }
</script>

<style scoped>
  .voting-section {
      border: 1px solid #e6a23c;
      border-radius: 4px;
      padding: 8px;
      background-color: #fefefe;
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



  .mb-4 {
      margin-bottom: 8px;
  }
</style>
