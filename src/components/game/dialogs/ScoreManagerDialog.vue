<template>
  <el-dialog
    v-model="visible"
    title="Выставление баллов игрокам"
    width="90%"
    :before-close="handleClose"
    destroy-on-close
    >
    <div class="score-manager">
      <el-alert
        title="Выставление дополнительных баллов"
        description="Базовые баллы уже установлены в зависимости от результата игры. Здесь вы можете добавить дополнительные баллы от -3 до +3"
        type="info"
        :closable="false"
        class="mb-4"
	/>

      <el-table 
        :data="playersWithScores" 
        stripe 
        style="width: 100%"
        class="scores-table"
	>
        <el-table-column prop="id" label="№" width="60" align="center" />
        
        <el-table-column prop="name" label="Игрок" width="150" />
        
        <el-table-column prop="originalRole" label="Роль" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.originalRole)" size="small">
              {{ row.originalRole }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="Статус" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row)" size="small">
              {{ getPlayerStatus(row) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column 
          prop="baseScore" 
          label="Базовый балл" 
          width="120" 
          align="center"
          >
          <template #default="{ row }">
            <span class="base-score">{{ getBaseScore(row.id) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="Доп. баллы" width="180" align="center">
          <template #default="{ row }">
            <el-input-number
              v-model="additionalScores[row.id]"
              :min="-3"
              :max="3"
              :step="0.1"
              :precision="1"
              size="small"
              controls-position="right"
              style="width: 120px"
              @change="updateScore(row.id)"
              />
          </template>
        </el-table-column>
        
        <el-table-column label="Итого" width="100" align="center">
          <template #default="{ row }">
            <el-tag 
              :type="getTotalScoreType(getTotalScore(row.id))"
              size="large"
              >
              <strong>{{ getTotalScore(row.id).toFixed(1) }}</strong>
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="Комментарий">
          <template #default="{ row }">
            <el-input
              v-model="comments[row.id]"
              placeholder="Комментарий к баллам (необязательно)"
              size="small"
              clearable
              />
          </template>
        </el-table-column>
      </el-table>

      <!-- Сводка по результатам -->
      <div class="score-summary mt-4">
        <el-card>
          <template #header>
            <h6>Итоговый рейтинг</h6>
          </template>
          
          <div class="ranking-list">
            <div 
              v-for="(player, index) in rankedPlayers"
              :key="player.id"
              class="ranking-item"
              >
              <div class="rank-position">
                <el-tag 
                  :type="getRankTagType(index + 1)"
                  size="large"
                  >
                  {{ index + 1 }}
                </el-tag>
              </div>
              
              <div class="player-info">
                <span class="player-name">{{ player.nickname }}</span>
                <span class="player-role">({{ player.originalRole }})</span>
              </div>
              
              <div class="player-score">
                <strong>{{ getTotalScore(player.id).toFixed(1) }}</strong>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">Отмена</el-button>
        <el-button @click="resetScores">Сбросить доп. баллы</el-button>
        <el-button 
          type="success" 
          @click="saveScores"
          :loading="saving"
          >
          Сохранить баллы
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
  import { ref, reactive, computed } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { GAME_STATUSES } from '@/utils/constants'
  import { ElMessage } from 'element-plus'

  const gameStore = useGameStore()

  const visible = ref(false)
  const saving = ref(false)
  const additionalScores = reactive({})
  const comments = reactive({})

  const playersWithScores = computed(() => {
      return gameStore.gameState.players.map(player => ({
	  ...player,
	  baseScore: getBaseScore(player.id),
	  additionalScore: additionalScores[player.id] || 0
      }))
  })

  const rankedPlayers = computed(() => {
      return [...gameStore.gameState.players]
	  .sort((a, b) => getTotalScore(b.id) - getTotalScore(a.id))
  })

  const show = () => {
      visible.value = true
      
      // Инициализируем дополнительные баллы
      gameStore.gameState.players.forEach(player => {
	  const currentScore = gameStore.getPlayerScore(player.id)
	  additionalScores[player.id] = currentScore.additionalScore || 0
	  comments[player.id] = ''
      })
  }

  const handleClose = () => {
      visible.value = false
  }

  const getBaseScore = (playerId) => {
      const score = gameStore.getPlayerScore(playerId)
      return score.baseScore || 0
  }

  const getTotalScore = (playerId) => {
      const baseScore = getBaseScore(playerId)
      const additionalScore = additionalScores[playerId] || 0
      return baseScore + additionalScore
  }

  const getRoleTagType = (role) => {
      const types = {
	  'Мирный': 'success',
	  'Шериф': 'primary', 
	  'Мафия': 'danger',
	  'Дон': 'warning'
      }
      return types[role] || 'info'
  }

  const getStatusTagType = (player) => {
      if (!player.isAlive) return 'danger'
      if (player.isEliminated) return 'warning'
      return 'success'
  }

  const getPlayerStatus = (player) => {
      if (!player.isAlive) return 'Убит'
      if (player.isEliminated) return 'Исключен'
      return 'Выжил'
  }

  const getTotalScoreType = (score) => {
      if (score >= 2) return 'success'
      if (score >= 1) return 'primary'
      if (score >= 0) return 'warning'
      return 'danger'
  }

  const getRankTagType = (position) => {
      if (position === 1) return 'success'
      if (position === 2) return 'primary'
      if (position === 3) return 'warning'
      return 'info'
  }

  const updateScore = (playerId) => {
      const baseScore = getBaseScore(playerId)
      const additionalScore = additionalScores[playerId] || 0
      gameStore.setPlayerScore(playerId, baseScore, additionalScore)
  }

  const resetScores = () => {
      gameStore.gameState.players.forEach(player => {
	  additionalScores[player.id] = 0
	  updateScore(player.id)
      })
      ElMessage.info('Дополнительные баллы сброшены')
  }

  const saveScores = async () => {
      saving.value = true
      
      try {
	  // Обновляем все баллы в сторе
	  gameStore.gameState.players.forEach(player => {
	      updateScore(player.id)
	  })
	  
	  // Переводим игру в статус "с баллами"
	  gameStore.setGameStatus(GAME_STATUSES.FINISHED_WITH_SCORES)
	  
	  // Сохраняем состояние
	  await gameStore.saveGameState()
	  
	  ElMessage.success('Баллы успешно сохранены!')
	  handleClose()
	  
      } catch (error) {
	  console.error('Ошибка сохранения баллов:', error)
	  ElMessage.error('Ошибка при сохранении баллов')
      } finally {
	  saving.value = false
      }
  }

  defineExpose({
      show
  })
</script>

<style scoped>
  .score-manager {
      padding: 8px 0;
  }

  .scores-table {
      margin-bottom: 24px;
  }

  .base-score {
      font-weight: 600;
      color: #606266;
  }

  .score-summary {
      border-top: 1px solid #ebeef5;
      padding-top: 24px;
  }

  .ranking-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
  }

  .ranking-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      background-color: #fafafa;
      border-radius: 4px;
      gap: 16px;
  }

  .rank-position {
      min-width: 40px;
  }

  .player-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
  }

  .player-name {
      font-weight: 500;
  }

  .player-role {
      color: #909399;
      font-size: 14px;
  }

  .player-score {
      font-size: 18px;
      color: #303133;
  }

  .mb-4 {
      margin-bottom: 16px;
  }

  .mt-4 {
      margin-top: 16px;
  }
</style>
