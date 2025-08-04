<template>
  <div class="game-timer">
    <div v-if="showCountdown" class="countdown-timer">
      <div class="countdown-title">{{ countdownTitle }}</div>
      <div class="countdown-display" :class="{ warning: timeLeft <= 10 }">
        {{ formattedCountdown }}
      </div>
      <el-progress 
        :percentage="progressPercentage" 
        :stroke-width="6"
        :color="progressColor"
        :show-text="false"
      />
    </div>
    
    <div v-else class="regular-timer">
      <div class="timer-display">
        <span class="time-text">{{ formattedTime }}</span>
      </div>
      
      <div class="timer-controls">
        <el-button-group>
          <el-tooltip content="Старт">
            <el-button 
              :icon="VideoPlay"
              :type="isRunning ? 'success' : 'primary'"
              size="small"
              @click="startTimer"
              :disabled="isRunning"
              />
          </el-tooltip>
          
          <el-tooltip content="Пауза">
            <el-button 
              :icon="VideoPause"
              type="warning"
              size="small"
              @click="stopTimer"
              :disabled="!isRunning"
              />
          </el-tooltip>
          
          <el-tooltip content="Сброс">
            <el-button 
              :icon="RefreshRight"
              type="info"
              size="small"
              @click="resetTimer"
              />
          </el-tooltip>
        </el-button-group>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onUnmounted, watch } from 'vue'
  import { 
      VideoPlay, 
      VideoPause, 
      RefreshRight 
  } from '@element-plus/icons-vue'
  import { useGameStore } from '@/stores/game'
  import { GAME_STATUSES } from '@/utils/constants'

  const gameStore = useGameStore()

  // Обычный таймер
  const seconds = ref(0)
  const isRunning = ref(false)
  let interval = null

  // Обратный отсчет для договорки и свободной посадки
  const timeLeft = ref(0)
  const totalTime = ref(0)
  let countdownInterval = null

  const showCountdown = computed(() => {
    return gameStore.gameState.gameStatus === GAME_STATUSES.NEGOTIATION ||
           gameStore.gameState.gameStatus === GAME_STATUSES.FREE_SEATING
  })

  const countdownTitle = computed(() => {
    switch (gameStore.gameState.gameStatus) {
      case GAME_STATUSES.NEGOTIATION:
        return 'Договорка'
      case GAME_STATUSES.FREE_SEATING:
        return 'Свободная посадка'
      default:
        return ''
    }
  })

  const formattedTime = computed(() => {
      const mins = Math.floor(seconds.value / 60)
      const secs = seconds.value % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  })

  const formattedCountdown = computed(() => {
      const mins = Math.floor(timeLeft.value / 60)
      const secs = timeLeft.value % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
  })

  const progressPercentage = computed(() => {
    if (totalTime.value === 0) return 0
    return Math.round((timeLeft.value / totalTime.value) * 100)
  })

  const progressColor = computed(() => {
    if (timeLeft.value <= 10) return '#f56c6c'
    if (timeLeft.value <= 20) return '#e6a23c'
    return '#67c23a'
  })

  // Обратный отсчет
  const startCountdown = (duration) => {
    clearCountdown()
    totalTime.value = duration
    timeLeft.value = duration
    
    countdownInterval = setInterval(() => {
      if (timeLeft.value > 0) {
        timeLeft.value--
      } else {
        clearCountdown()
        // Автоматический переход к следующему этапу
        if (gameStore.gameState.gameStatus === GAME_STATUSES.NEGOTIATION) {
          gameStore.setGameStatus(GAME_STATUSES.FREE_SEATING)
        }
      }
    }, 1000)
  }

  const clearCountdown = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
  }

  // Обычный таймер
  const startTimer = () => {
      if (isRunning.value) return
      
      isRunning.value = true
      interval = setInterval(() => {
	  seconds.value++
      }, 1000)
  }

  const stopTimer = () => {
      if (!isRunning.value) return
      
      isRunning.value = false
      if (interval) {
	  clearInterval(interval)
	  interval = null
      }
  }

  const resetTimer = () => {
      stopTimer()
      seconds.value = 0
  }

  // Следим за изменением статуса игры
  watch(() => gameStore.gameState.gameStatus, (newStatus) => {
    // Сбрасываем обычный таймер при изменении статуса
    resetTimer()
    
    switch (newStatus) {
      case GAME_STATUSES.NEGOTIATION:
        startCountdown(60) // 1 минута
        break
      case GAME_STATUSES.FREE_SEATING:
        startCountdown(40) // 40 секунд
        break
      default:
        clearCountdown()
    }
  })

  onUnmounted(() => {
      if (interval) {
	  clearInterval(interval)
      }
      clearCountdown()
  })
</script>

<style scoped>
  .game-timer {
      display: flex;
      align-items: center;
      gap: 12px;
  }

  .regular-timer {
      display: flex;
      align-items: center;
      gap: 12px;
  }

  .timer-display {
      background-color: #303133;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
  }

  .time-text {
      font-size: 20px;
      font-weight: bold;
  }

  .timer-controls {
      display: flex;
  }

  /* Стили для обратного отсчета */
  .countdown-timer {
    background: #f5f7fa;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    min-width: 300px;
  }

  .countdown-title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 10px;
  }

  .countdown-display {
    font-size: 48px;
    font-weight: bold;
    color: #409eff;
    font-family: 'Courier New', monospace;
    margin-bottom: 15px;
  }

  .countdown-display.warning {
    color: #f56c6c;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.6; }
    100% { opacity: 1; }
  }

  :deep(.el-progress) {
    margin: 0 auto;
  }
</style>
