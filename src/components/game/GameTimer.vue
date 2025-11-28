<template>
  <div class="game-timer">
    <div class="timer-container" :class="{ 'timer-expired': isTimerExpired, 'timer-paused': !isRunning }" @click="handleTimer">
      <div class="timer-display">
        {{ formattedTime }}
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { GAME_STATUSES, GAME_SUBSTATUS } from '@/utils/constants'

  const gameStore = useGameStore()

  // Постоянно работающий таймер
  const seconds = ref(0)
  const isRunning = ref(true)
  let interval = null

  // Получение времени для текущей фазы
  const getPhaseTime = () => {
      if (gameStore.gameState.gameStatus === GAME_STATUSES.NEGOTIATION) {
          return 60 // 1 минута для договорки
      } else if (gameStore.gameState.gameStatus === GAME_STATUSES.FREE_SEATING) {
          return 40 // 40 секунд для свободной посадки
      }
      return 0 // Для других фаз таймер отсчитывает вперёд
  }

  const formattedTime = computed(() => {
      const phaseTime = getPhaseTime()
      let displaySeconds
      
      if (phaseTime > 0) {
          // Обратный отсчёт для договорки и свободной посадки
          displaySeconds = Math.max(0, phaseTime - seconds.value)
      } else {
          // Прямой отсчёт для остальных фаз
          displaySeconds = seconds.value
      }
      
      const mins = Math.floor(displaySeconds / 60)
      const secs = displaySeconds % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  })

  const isTimerExpired = computed(() => {
      const phaseTime = getPhaseTime()
      return phaseTime > 0 && seconds.value >= phaseTime
  })

  // Запуск таймера
  const startTimer = () => {
      if (interval) return // уже запущен
      
      interval = setInterval(() => {
          if (!isRunning.value) return // таймер на паузе
          
          const phaseTime = getPhaseTime()
          if (phaseTime > 0 && seconds.value >= phaseTime) {
              // Таймер достиг лимита для фазы - останавливаем на 0
              return
          }
          seconds.value++
      }, 1000)
  }

  // Обработка клика по таймеру
  const handleTimer = () => {
      if (isRunning.value) {
          // Если таймер работает - останавливаем и сбрасываем
          isRunning.value = false
          seconds.value = 0
      } else {
          // Если таймер остановлен - запускаем
          isRunning.value = true
      }
  }
  
  // Обработчик нажатия пробела
  const handleKeydown = (event) => {
    if (event.code === 'Space') {
      event.preventDefault()
      handleTimer()
    }
  }

  // Следим за изменением статуса и подстатуса игры
  watch(() => [gameStore.gameState.gameStatus, gameStore.gameState.gameSubstatus], () => {
    // Сбрасываем таймер при любых переходах между фазами
    seconds.value = 0
    isRunning.value = true // автоматически запускаем после перехода фаз
  })

  onMounted(() => {
    // Запускаем таймер сразу при монтировании
    startTimer()
    
    // Добавляем обработчик нажатия пробела
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
      if (interval) {
	  clearInterval(interval)
      }
      
      // Убираем обработчик нажатия пробела
      document.removeEventListener('keydown', handleKeydown)
  })
</script>

<style scoped>
  .game-timer {
      display: flex;
      align-items: center;
      justify-content: center;
  }

  .timer-container {
      background: #f5f7fa;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      min-width: 300px;
      cursor: pointer;
      user-select: none;
  }

  .timer-container:hover {
      background: #e8f4ff;
  }

  .timer-container.timer-expired {
      background: #fef0f0;
      border: 2px solid #f56c6c;
  }

  .timer-container.timer-expired:hover {
      background: #fdf2f2;
  }

  .timer-container.timer-paused {
      background: #fff7e6;
      border: 2px solid #f0a020;
  }

  .timer-container.timer-paused:hover {
      background: #fff4db;
  }

  .timer-display {
      font-size: 48px;
      font-weight: bold;
      color: #409eff;
      font-family: 'Courier New', monospace;
  }

  .timer-expired .timer-display {
      color: #f56c6c;
  }

  .timer-paused .timer-display {
      color: #f0a020;
  }
</style>
