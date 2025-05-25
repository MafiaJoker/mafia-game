<template>
  <el-card class="night-section mb-4">
    <template #header>
      <div class="card-header">
        <el-icon><Moon /></el-icon>
        <span>Ночные действия</span>
      </div>
    </template>

    <div class="night-content">
      <!-- Стрельба мафии -->
      <div class="action-group mb-6">
        <h5 class="action-title">
          <el-icon><Sword /></el-icon>
          Стрельба мафии:
        </h5>
        
        <div v-if="!hasMafiaAlive" class="no-players">
          <el-alert 
            title="Нет живых игроков команды мафии"
            type="info"
            :closable="false"
            />
        </div>
        
        <div v-else class="targets-grid">
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

      <!-- Проверка дона -->
      <div class="action-group mb-6">
        <h5 class="action-title">
          <el-icon><Crown /></el-icon>
          Проверка дона:
        </h5>
        
        <div v-if="!hasDonAlive" class="no-players">
          <el-alert 
            title="Дон мертв или отсутствует"
            type="info"
            :closable="false"
            />
        </div>
        
        <div v-else>
          <div class="targets-grid mb-3">
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

      <!-- Проверка шерифа -->
      <div class="action-group">
        <h5 class="action-title">
          <el-icon><Shield /></el-icon>
          Проверка шерифа:
        </h5>
        
        <div v-if="!hasSheriffAlive" class="no-players">
          <el-alert 
            title="Шериф мертв или отсутствует"
            type="info"
            :closable="false"
            />
        </div>
        
        <div v-else>
          <div class="targets-grid mb-3">
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
  </el-card>
</template>

<script setup>
  import { computed, ref } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { useNightActionsStore } from '@/stores/nightActions'
  import { PLAYER_ROLES } from '@/utils/constants'
  import { 
      Moon, 
      Sword, 
      Crown, 
      Shield 
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
      return gameStore.gameState.mafiaTarget === playerId ? 'danger' : 'default'
  }

  const getDonTargetType = (playerId) => {
      return gameStore.gameState.donTarget === playerId ? 'warning' : 'default'
  }

  const getSheriffTargetType = (playerId) => {
      return gameStore.gameState.sheriffTarget === playerId ? 'primary' : 'default'
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
      border: 2px solid #409eff;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  }

  .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #409eff;
  }

  .night-content {
      padding: 8px 0;
  }

  .action-group {
      padding: 16px 0;
  }

  .action-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px 0;
      font-weight: 600;
      color: #303133;
  }

  .no-players {
      padding: 16px 0;
  }

  .targets-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
  }

  .check-result {
      margin-top: 16px;
  }

  .mb-3 {
      margin-bottom: 12px;
  }

  .mb-6 {
      margin-bottom: 24px;
  }
</style>
