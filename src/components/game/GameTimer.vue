<template>
  <div class="game-timer">
    <div class="timer-container" :class="timerClasses" @click="handleTimer">
      <div class="timer-display">
        {{ formattedTime }}
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
  import { COUNTDOWN_PHASES } from '@/utils/constants.js'

  const props = defineProps({
    isNegotiationStarted: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits(['phase-changed'])

  // Режимы таймера
  const TIMER_MODES = {
    COUNT_UP: 'count_up', // Прямой отсчет от 0
    COUNTDOWN: 'countdown' // Обратный отсчет 60+40
  }

  const seconds = ref(0)
  const isRunning = ref(true)
  const timerMode = ref(TIMER_MODES.COUNT_UP)
  const countdownPhase = ref(COUNTDOWN_PHASES.MAFIA_NEGOTIATION)
  const isFlashing = ref(false)
  let interval = null

  const formattedTime = computed(() => {
      let displaySeconds

      if (timerMode.value === TIMER_MODES.COUNTDOWN) {
          // Обратный отсчет
          if (countdownPhase.value === COUNTDOWN_PHASES.MAFIA_NEGOTIATION) {
              displaySeconds = Math.max(0, 60 - seconds.value)
          } else if (countdownPhase.value === COUNTDOWN_PHASES.FREE_SEATING) {
              displaySeconds = Math.max(0, 40 - seconds.value)
          } else {
              displaySeconds = 0
          }
      } else {
          // Прямой отсчет
          displaySeconds = seconds.value
      }

      const mins = Math.floor(displaySeconds / 60)
      const secs = displaySeconds % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  })

  const isTimerExpired = computed(() => {
      if (timerMode.value === TIMER_MODES.COUNTDOWN) {
          if (countdownPhase.value === COUNTDOWN_PHASES.MAFIA_NEGOTIATION) {
              return seconds.value >= 60
          } else if (countdownPhase.value === COUNTDOWN_PHASES.FREE_SEATING) {
              return seconds.value >= 40
          }
      }
      return false
  })

  const shouldHighlightYellow = computed(() => {
      if (timerMode.value === TIMER_MODES.COUNTDOWN) {
          // Желтый на последних 10 секундах (когда осталось меньше 10)
          const displaySeconds = parseInt(formattedTime.value.split(':')[0]) * 60 + parseInt(formattedTime.value.split(':')[1])
          return displaySeconds > 0 && displaySeconds < 10
      } else {
          // Желтый если прошло больше 60 секунд при прямом отсчете
          return seconds.value > 60
      }
  })

  const timerClasses = computed(() => ({
      'timer-expired': isTimerExpired.value,
      'timer-paused': !isRunning.value,
      'timer-flashing': isFlashing.value,
      'timer-warning': shouldHighlightYellow.value && !isTimerExpired.value
  }))

  // Переход к следующей фазе при обратном отсчете
  const transitionToNextPhase = async () => {
      if (countdownPhase.value === COUNTDOWN_PHASES.MAFIA_NEGOTIATION) {
          // Показываем желтую вспышку
          isFlashing.value = true
          countdownPhase.value = COUNTDOWN_PHASES.TRANSITION

          // Ждем 500мс (вспышка)
          await new Promise(resolve => setTimeout(resolve, 500))

          // Переходим к свободной рассадке
          isFlashing.value = false
          countdownPhase.value = COUNTDOWN_PHASES.FREE_SEATING
          seconds.value = 0
          emit('phase-changed', COUNTDOWN_PHASES.FREE_SEATING)
      } else if (countdownPhase.value === COUNTDOWN_PHASES.FREE_SEATING) {
          // Останавливаем таймер после завершения свободной рассадки
          isRunning.value = false
      }
  }

  // Запуск таймера
  const startTimer = () => {
      if (interval) return // уже запущен

      interval = setInterval(() => {
          if (!isRunning.value) return // таймер на паузе

          if (timerMode.value === TIMER_MODES.COUNTDOWN && isTimerExpired.value) {
              // Таймер достиг лимита для фазы - переходим к следующей
              transitionToNextPhase()
              return
          }

          seconds.value++
      }, 1000)
  }

  // Начать режим обратного отсчета
  const startCountdownMode = () => {
      timerMode.value = TIMER_MODES.COUNTDOWN
      countdownPhase.value = COUNTDOWN_PHASES.MAFIA_NEGOTIATION
      seconds.value = 0
      isRunning.value = true
  }

  // Вернуться к режиму прямого отсчета
  const resetToCountUpMode = () => {
      timerMode.value = TIMER_MODES.COUNT_UP
      seconds.value = 0
      isRunning.value = true
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

  // Следим за изменением пропса isNegotiationStarted
  watch(() => props.isNegotiationStarted, (newValue, oldValue) => {
      if (newValue && !oldValue) {
          // Договорка началась - переходим в режим обратного отсчета
          startCountdownMode()
      } else if (!newValue && oldValue) {
          // Вернулись к раздаче ролей - возвращаемся к прямому отсчету
          resetToCountUpMode()
      }
  })

  // Обработчик нажатия пробела
  const handleKeydown = (event) => {
    if (event.code === 'Space') {
      event.preventDefault()
      handleTimer()
    }
  }

  onMounted(() => {
    // Если при монтировании договорка уже началась, запускаем в режиме COUNTDOWN
    if (props.isNegotiationStarted) {
      startCountdownMode()
    }

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
      transition: background 0.3s ease;
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

  .timer-container.timer-warning {
      background: #fffbe6;
      border: 2px solid #fadb14;
  }

  .timer-container.timer-warning:hover {
      background: #fff9db;
  }

  .timer-container.timer-flashing {
      animation: flash-yellow 0.5s ease;
  }

  @keyframes flash-yellow {
      0%, 100% {
          background: #f5f7fa;
      }
      50% {
          background: #fff7e6;
          border: 2px solid #fadb14;
      }
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

  .timer-warning .timer-display {
      color: #faad14;
  }
</style>
