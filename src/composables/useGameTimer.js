import { ref, computed, readonly } from 'vue'
import { COUNTDOWN_PHASES } from '@/utils/constants.js'

// Режимы таймера
export const TIMER_MODES = {
  COUNT_UP: 'count_up', // Прямой отсчет от 0
  COUNTDOWN: 'countdown' // Обратный отсчет 60+40
}

// Сколько длится каждая фаза обратного отсчета, секунды
const COUNTDOWN_LIMITS = {
  [COUNTDOWN_PHASES.MAFIA_NEGOTIATION]: 60,
  [COUNTDOWN_PHASES.FREE_SEATING]: 40
}

// Длительность желтой вспышки на переходе между фазами, мс
const FLASH_DURATION = 500

// Одно состояние на всё приложение: таймер в шапке игры и таймер в шапке
// диалога - один и тот же идущий таймер. Держи состояние внутри компонента -
// и два отрисованных экземпляра тикали бы каждый сам по себе
const seconds = ref(0)
const isRunning = ref(true)
const mode = ref(TIMER_MODES.COUNT_UP)
const countdownPhase = ref(COUNTDOWN_PHASES.MAFIA_NEGOTIATION)
const isFlashing = ref(false)

// Интервал и обработчик пробела тоже одни на всех: иначе секунда шла бы за две,
// а пробел переключал бы таймер дважды и возвращал его в исходное состояние
let interval = null

const displaySeconds = computed(() => {
  if (mode.value !== TIMER_MODES.COUNTDOWN) {
    return seconds.value
  }

  const limit = COUNTDOWN_LIMITS[countdownPhase.value]
  return limit === undefined ? 0 : Math.max(0, limit - seconds.value)
})

const formattedTime = computed(() => {
  const mins = Math.floor(displaySeconds.value / 60)
  const secs = displaySeconds.value % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const isExpired = computed(() => {
  if (mode.value !== TIMER_MODES.COUNTDOWN) {
    return false
  }

  const limit = COUNTDOWN_LIMITS[countdownPhase.value]
  return limit !== undefined && seconds.value >= limit
})

const shouldHighlightYellow = computed(() => {
  if (mode.value === TIMER_MODES.COUNTDOWN) {
    // Желтый на последних 10 секундах (когда осталось меньше 10)
    return displaySeconds.value > 0 && displaySeconds.value < 10
  }

  // Желтый если прошло больше 60 секунд при прямом отсчете
  return seconds.value > 60
})

const timerClasses = computed(() => ({
  'timer-expired': isExpired.value,
  'timer-paused': !isRunning.value,
  'timer-flashing': isFlashing.value,
  'timer-warning': shouldHighlightYellow.value && !isExpired.value
}))

// Переход к следующей фазе при обратном отсчете
const transitionToNextPhase = async () => {
  if (countdownPhase.value === COUNTDOWN_PHASES.MAFIA_NEGOTIATION) {
    // Показываем желтую вспышку
    isFlashing.value = true
    countdownPhase.value = COUNTDOWN_PHASES.TRANSITION

    await new Promise(resolve => setTimeout(resolve, FLASH_DURATION))

    // Переходим к свободной рассадке
    isFlashing.value = false
    countdownPhase.value = COUNTDOWN_PHASES.FREE_SEATING
    seconds.value = 0
  } else if (countdownPhase.value === COUNTDOWN_PHASES.FREE_SEATING) {
    // Останавливаем таймер после завершения свободной рассадки
    isRunning.value = false
  }
}

const tick = () => {
  if (!isRunning.value) return // таймер на паузе

  if (mode.value === TIMER_MODES.COUNTDOWN && isExpired.value) {
    // Таймер достиг лимита для фазы - переходим к следующей
    transitionToNextPhase()
    return
  }

  seconds.value++
}

// Клик по таймеру: идет - остановить и сбросить, стоит - запустить
const toggle = () => {
  if (isRunning.value) {
    isRunning.value = false
    seconds.value = 0
  } else {
    isRunning.value = true
  }
}

// Начать режим обратного отсчета
const startCountdown = () => {
  mode.value = TIMER_MODES.COUNTDOWN
  countdownPhase.value = COUNTDOWN_PHASES.MAFIA_NEGOTIATION
  isFlashing.value = false
  seconds.value = 0
  isRunning.value = true
}

// Вернуться к режиму прямого отсчета
const resetToCountUp = () => {
  mode.value = TIMER_MODES.COUNT_UP
  seconds.value = 0
  isRunning.value = true
}

// Полный сброс к исходному состоянию - на новый круг и на новую игру
const reset = () => {
  seconds.value = 0
  isRunning.value = true
  mode.value = TIMER_MODES.COUNT_UP
  countdownPhase.value = COUNTDOWN_PHASES.MAFIA_NEGOTIATION
  isFlashing.value = false
}

const handleKeydown = (event) => {
  if (event.code === 'Space') {
    event.preventDefault()
    toggle()
  }
}

// Запускает ход времени и пробел. Зовет экран игры, а не сам таймер:
// экземпляров таймера на экране может быть несколько, а тикать должен один
const activate = () => {
  if (interval) return // уже запущен

  interval = setInterval(tick, 1000)
  document.addEventListener('keydown', handleKeydown)
}

const deactivate = () => {
  if (interval) {
    clearInterval(interval)
    interval = null
  }

  document.removeEventListener('keydown', handleKeydown)
}

export function useGameTimer() {
  return {
    isRunning: readonly(isRunning),
    countdownPhase: readonly(countdownPhase),
    formattedTime,
    timerClasses,
    toggle,
    reset,
    startCountdown,
    resetToCountUp,
    activate,
    deactivate
  }
}
