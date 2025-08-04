<template>
  <div class="game-timer">
    <div class="timer-container" @click="resetTimer">
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
  let interval = null

  const formattedTime = computed(() => {
      const mins = Math.floor(seconds.value / 60)
      const secs = seconds.value % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  })

  // Запуск таймера
  const startTimer = () => {
      if (interval) return // уже запущен
      
      interval = setInterval(() => {
	  seconds.value++
      }, 1000)
  }

  // Сброс таймера (по клику или пробелу)
  const resetTimer = () => {
      seconds.value = 0
  }

  // Обработчик нажатия пробела
  const handleKeydown = (event) => {
    if (event.code === 'Space') {
      event.preventDefault()
      resetTimer()
    }
  }

  // Следим за изменением статуса и подстатуса игры
  watch(() => [gameStore.gameState.gameStatus, gameStore.gameState.gameSubstatus], () => {
    // Сбрасываем таймер при любых переходах между фазами
    resetTimer()
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

  .timer-display {
      font-size: 48px;
      font-weight: bold;
      color: #409eff;
      font-family: 'Courier New', monospace;
  }
</style>
