<template>
  <div class="game-timer" :class="{ 'is-compact': compact }">
    <div class="timer-container" :class="timerClasses" @click="toggle">
      <div class="timer-display">
        {{ formattedTime }}
      </div>
    </div>
  </div>
</template>

<script setup>
  import { useGameTimer } from '@/composables/useGameTimer'

  defineProps({
    // Вид для шапки диалога: одна строка во всю ширину вместо крупной плашки
    compact: {
      type: Boolean,
      default: false
    }
  })

  // Ход времени, режимы и пробел живут в композабле: экземпляров таймера на
  // экране может быть два - в шапке игры и в шапке открытого диалога
  const { formattedTime, timerClasses, toggle } = useGameTimer()
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
      -webkit-tap-highlight-color: transparent;
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
      line-height: 1;
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

  /* Компактный вид меняет только размеры: цвета состояний (пауза, последние
     секунды, конец фазы) остаются от общих правил выше */
  .game-timer.is-compact {
      width: 100%;
  }

  .is-compact .timer-container {
      width: 100%;
      min-width: 0;
      padding: 4px 12px;
  }

  .is-compact .timer-display {
      font-size: 30px;
  }

  /* Планшет: таймер компактнее, чтобы уместиться в шапке рядом с названием */
  @media (min-width: 768px) and (max-width: 1023px) {
      .timer-container {
          min-width: 200px;
          padding: 10px 20px;
      }

      .timer-display {
          font-size: 40px;
      }
  }

  /* Телефон: таймер полосой во всю ширину под названием, фон белый -
     шапка на телефоне серая, и таймер иначе сливается с ней */
  @media (max-width: 767px) {
      .game-timer {
          width: 100%;
      }

      .timer-container {
          width: 100%;
          min-width: 0;
          padding: 6px 12px;
          background: #fff;
          border: 2px solid #e4e7ed;
      }

      .timer-display {
          font-size: 36px;
      }
  }
</style>
