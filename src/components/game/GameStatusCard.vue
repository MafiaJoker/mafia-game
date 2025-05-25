<template>
  <el-card v-if="showStatusCard" class="game-status-card mb-4">
    <div class="status-content">
      <div class="status-icon">
        <el-icon :size="24" :color="statusColor">
          <component :is="statusIcon" />
        </el-icon>
      </div>
      
      <div class="status-text">
        <h4 class="status-title">{{ statusTitle }}</h4>
        <p v-if="statusDescription" class="status-description">
          {{ statusDescription }}
        </p>
      </div>
      
      <div v-if="showProgress" class="status-progress">
        <el-progress 
          :percentage="progressPercentage"
          :status="progressStatus"
          :stroke-width="8"
          />
      </div>
    </div>
  </el-card>
</template>

<script setup>
  import { computed } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { 
      GAME_STATUSES, 
      GAME_SUBSTATUS,
      GAME_STATUS_NAMES,
      GAME_SUBSTATUS_NAMES 
  } from '@/utils/constants'
  import { 
      DocumentAdd,
      User,
      UserFilled,
      Trophy,
      Timer,
      Moon,
      Checked,
      Warning,
      CircleClose
  } from '@element-plus/icons-vue'

  const gameStore = useGameStore()

  const showStatusCard = computed(() => {
      return gameStore.gameState.gameStatus !== GAME_STATUSES.CREATED
  })

  const statusTitle = computed(() => {
      const status = GAME_STATUS_NAMES[gameStore.gameState.gameStatus] || 'Неизвестно'
      const substatus = gameStore.gameState.gameSubstatus 
	    ? GAME_SUBSTATUS_NAMES[gameStore.gameState.gameSubstatus] 
	    : null
      
      return substatus ? `${status} - ${substatus}` : status
  })

  const statusDescription = computed(() => {
      const status = gameStore.gameState.gameStatus
      const substatus = gameStore.gameState.gameSubstatus
      
      switch (status) {
      case GAME_STATUSES.SEATING_READY:
	  return 'Рассадка готова. Можно приступать к раздаче ролей.'
	  
      case GAME_STATUSES.ROLE_DISTRIBUTION:
	  return 'Распределите роли между игроками: 2 мафии, 1 дон, 1 шериф.'
	  
      case GAME_STATUSES.IN_PROGRESS:
	  switch (substatus) {
          case GAME_SUBSTATUS.DISCUSSION:
              return 'Идет обсуждение. Игроки выдвигают кандидатуры.'
          case GAME_SUBSTATUS.CRITICAL_DISCUSSION:
              return 'Критический круг! Угадайка - последний шанс города.'
          case GAME_SUBSTATUS.VOTING:
              return 'Голосование по выставленным кандидатурам.'
          case GAME_SUBSTATUS.NIGHT:
              return 'Ночь. Мафия стреляет, дон и шериф проверяют.'
          case GAME_SUBSTATUS.SUSPECTS_SPEECH:
              return 'Речь подозреваемых на попиле.'
          case GAME_SUBSTATUS.FAREWELL_MINUTE:
              return 'Прощальная минута заголосованного игрока.'
          default:
              return 'Игра в процессе.'
	  }
	  
      case GAME_STATUSES.FINISHED_NO_SCORES:
	  return 'Игра завершена. Выставите баллы игрокам.'
	  
      case GAME_STATUSES.FINISHED_WITH_SCORES:
	  return 'Игра завершена с выставленными баллами.'
	  
      case GAME_STATUSES.CANCELLED:
	  return 'Игра была отменена.'
	  
      default:
	  return null
      }
  })

  const statusIcon = computed(() => {
      const status = gameStore.gameState.gameStatus
      const substatus = gameStore.gameState.gameSubstatus
      
      switch (status) {
      case GAME_STATUSES.SEATING_READY:
	  return User
      case GAME_STATUSES.ROLE_DISTRIBUTION:
	  return UserFilled
      case GAME_STATUSES.IN_PROGRESS:
	  switch (substatus) {
          case GAME_SUBSTATUS.VOTING:
              return Checked
          case GAME_SUBSTATUS.NIGHT:
              return Moon
          case GAME_SUBSTATUS.CRITICAL_DISCUSSION:
              return Warning
          default:
              return Timer
	  }
      case GAME_STATUSES.FINISHED_NO_SCORES:
      case GAME_STATUSES.FINISHED_WITH_SCORES:
	  return Trophy
      case GAME_STATUSES.CANCELLED:
	  return CircleClose
      default:
	  return DocumentAdd
      }
  })

  const statusColor = computed(() => {
      const status = gameStore.gameState.gameStatus
      const substatus = gameStore.gameState.gameSubstatus
      
      switch (status) {
      case GAME_STATUSES.SEATING_READY:
	  return '#409eff'
      case GAME_STATUSES.ROLE_DISTRIBUTION:
	  return '#e6a23c'
      case GAME_STATUSES.IN_PROGRESS:
	  switch (substatus) {
          case GAME_SUBSTATUS.CRITICAL_DISCUSSION:
              return '#f56c6c'
          case GAME_SUBSTATUS.NIGHT:
              return '#909399'
          default:
              return '#67c23a'
	  }
      case GAME_STATUSES.FINISHED_NO_SCORES:
      case GAME_STATUSES.FINISHED_WITH_SCORES:
	  return '#67c23a'
      case GAME_STATUSES.CANCELLED:
	  return '#f56c6c'
      default:
	  return '#909399'
      }
  })

  const showProgress = computed(() => {
      return gameStore.gameState.gameStatus === GAME_STATUSES.IN_PROGRESS
  })

  const progressPercentage = computed(() => {
      if (!showProgress.value) return 0
      
      const round = gameStore.gameState.round
      const maxRounds = 10 // Примерная максимальная длительность игры
      
      return Math.min((round / maxRounds) * 100, 100)
  })

  const progressStatus = computed(() => {
      const percentage = progressPercentage.value
      
      if (percentage < 30) return 'success'
      if (percentage < 70) return 'warning'
      return 'exception'
  })
</script>

<style scoped>
  .game-status-card {
      border-left: 4px solid v-bind(statusColor);
  }

  .status-content {
      display: flex;
      align-items: center;
      gap: 16px;
  }

  .status-icon {
      flex-shrink: 0;
  }

  .status-text {
      flex: 1;
  }

  .status-title {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 600;
      color: #303133;
  }

  .status-description {
      margin: 0;
      color: #606266;
      font-size: 14px;
  }

  .status-progress {
      flex-shrink: 0;
      width: 120px;
  }

  .mb-4 {
      margin-bottom: 16px;
  }
</style>
