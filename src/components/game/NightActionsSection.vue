<template>
  <div class="night-section mb-4">
      <!-- Стрельба мафии -->
      <div class="action-group mb-3">
        <div class="action-row">
          <div class="action-icon">
            <el-icon><Aim /></el-icon>
          </div>
          
          <div class="action-content">
            <div v-if="!hasMafiaAlive" class="no-players">
              <el-alert 
                title="Нет живых игроков команды мафии"
                type="info"
                :closable="false"
                />
            </div>
            
            <div v-else class="targets-buttons">
              <el-button-group>
                <el-button 
                  v-for="player in aliveTargets"
                  :key="`mafia-${player.id}`"
                  :type="getMafiaTargetType(player.id)"
                  @click="selectMafiaTarget(player.id)"
                  >
                  {{ player.id }}
                </el-button>
                <el-button 
                  :type="getMafiaTargetType(0)"
                  @click="selectMafiaTarget(0)"
                  >
                  Промах
                </el-button>
              </el-button-group>
            </div>
          </div>
        </div>
      </div>

      <!-- Проверка дона -->
      <div class="action-group mb-3">
        <div class="action-row">
          <div class="action-icon">
            <el-icon><Aim /></el-icon>
          </div>
          
          <div class="action-content">
            <div v-if="!hasDonAlive" class="no-players">
              <el-alert 
                title="Дон мертв или отсутствует"
                type="info"
                :closable="false"
                />
            </div>
            
            <div v-else>
              <div class="targets-buttons mb-2">
                <el-button-group>
                  <el-button 
                    v-for="player in aliveTargets"
                    :key="`don-${player.id}`"
                    :type="getDonTargetType(player.id)"
                    @click="selectDonTarget(player.id)"
		    >
                    {{ player.id }}
                  </el-button>
                </el-button-group>
              </div>
              
              <div v-if="donCheckResult" class="check-result">
                <el-alert 
                  :title="donCheckResult.message"
                  :type="donCheckResult.type"
                  :closable="false"
                  show-icon
                  />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Проверка шерифа -->
      <div class="action-group">
        <div class="action-row">
          <div class="action-icon">
            <el-icon><Orange /></el-icon>
          </div>
          
          <div class="action-content">
            <div v-if="!hasSheriffAlive" class="no-players">
              <el-alert 
                title="Шериф мертв или отсутствует"
                type="info"
                :closable="false"
                />
            </div>
            
            <div v-else>
              <div class="targets-buttons mb-2">
                <el-button-group>
                  <el-button 
                    v-for="player in aliveTargets"
                    :key="`sheriff-${player.id}`"
                    :type="getSheriffTargetType(player.id)"
                    @click="selectSheriffTarget(player.id)"
		    >
                    {{ player.id }}
                  </el-button>
                </el-button-group>
              </div>
              
              <div v-if="sheriffCheckResult" class="check-result">
                <el-alert 
                  :title="sheriffCheckResult.message"
                  :type="sheriffCheckResult.type"
                  :closable="false"
                  show-icon
                  />
              </div>
            </div>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup>
  import { computed, ref } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { useNightActionsStore } from '@/stores/nightActions'
  import { PLAYER_ROLES } from '@/utils/constants'
  import { 
      Moon, 
      Aim, 
      Orange 
  } from '@element-plus/icons-vue'

  const gameStore = useGameStore()
  const nightActionsStore = useNightActionsStore()

  const donCheckResult = ref(null)
  const sheriffCheckResult = ref(null)

  const aliveTargets = computed(() => {
      return gameStore.gameState.players.filter(p => p.isAlive && !p.isEliminated)
  })

  const hasMafiaAlive = computed(() => {
      return gameStore.gameState.players.some(p => 
	  (p.originalRole === PLAYER_ROLES.MAFIA || p.originalRole === PLAYER_ROLES.DON) && 
	      p.isAlive && !p.isEliminated
      )
  })

  const hasDonAlive = computed(() => {
      return gameStore.gameState.players.some(p => 
	  p.originalRole === PLAYER_ROLES.DON && p.isAlive && !p.isEliminated
      )
  })

  const hasSheriffAlive = computed(() => {
      return gameStore.gameState.players.some(p => 
	  p.originalRole === PLAYER_ROLES.SHERIFF && p.isAlive && !p.isEliminated
      )
  })

  const getMafiaTargetType = (playerId) => {
      return gameStore.gameState.mafiaTarget === playerId ? 'danger' : 'info'
  }

  const getDonTargetType = (playerId) => {
      return gameStore.gameState.donTarget === playerId ? 'warning' : 'info'
  }

  const getSheriffTargetType = (playerId) => {
      return gameStore.gameState.sheriffTarget === playerId ? 'primary' : 'info'
  }

  const selectMafiaTarget = (playerId) => {
      gameStore.gameState.mafiaTarget = playerId
  }

  const selectDonTarget = (playerId) => {
      gameStore.gameState.donTarget = playerId
      
      if (playerId) {
	  const result = nightActionsStore.checkDon(playerId)
	  if (result) {
	      donCheckResult.value = {
		  message: result.isSheriff 
		      ? `Игрок ${result.targetId}: ${result.targetName} является шерифом!`
		      : `Игрок ${result.targetId}: ${result.targetName} не является шерифом.`,
		  type: result.isSheriff ? 'success' : 'error'
	      }
	  }
      } else {
	  donCheckResult.value = null
      }
  }

  const selectSheriffTarget = (playerId) => {
      gameStore.gameState.sheriffTarget = playerId
      
      if (playerId) {
	  const result = nightActionsStore.checkSheriff(playerId)
	  if (result) {
	      sheriffCheckResult.value = {
		  message: result.isMafia 
		      ? `Игрок ${result.targetId}: ${result.targetName} является членом мафии!`
		      : `Игрок ${result.targetId}: ${result.targetName} является мирным жителем.`,
		  type: result.isMafia ? 'error' : 'success'
	      }
	  }
      } else {
	  sheriffCheckResult.value = null
      }
  }
</script>

<style scoped>
  .night-section {
      border: 1px solid #409eff;
      border-radius: 4px;
      padding: 8px;
      background-color: #fafcff;
  }

  .action-group {
      padding: 4px 0;
  }

  .action-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
  }

  .action-icon {
      display: flex;
      align-items: center;
      color: #409eff;
      margin-top: 4px;
  }

  .action-content {
      flex: 1;
  }

  .no-players {
      padding: 8px 0;
  }

  .targets-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-start;
  }

  .check-result {
      margin-top: 8px;
  }

  .mb-2 {
      margin-bottom: 8px;
  }

  .mb-3 {
      margin-bottom: 12px;
  }
</style>
