<template>
  <div class="dies-between">
    <!-- Нейтральная картинка в весь экран. Она нарисована прямо здесь, а не
         подгружается файлом: в эфире пустой чёрный экран недопустим, в том
         числе в первые миллисекунды, пока картинка ещё не пришла.
         Два неоновых пятна медленно дышат и расходятся - картинка живая,
         но за ней ничего не следишь -->
    <div class="dies-backdrop">
      <div class="backdrop-glow backdrop-glow--green"></div>
      <div class="backdrop-glow backdrop-glow--purple"></div>
      <div class="backdrop-haze"></div>
      <div class="backdrop-vignette"></div>
    </div>

    <div class="dies-between-content">
      <div class="dies-between-header">
        <span class="event-label">{{ event?.label || 'Мафия' }}</span>
        <span v-if="event?.table_name" class="event-table">{{ event.table_name }}</span>
      </div>

      <!-- Верхний ряд: состав прошлой игры с ролями и итогом -->
      <section v-if="previousGame" class="dies-row">
        <div class="row-header">
          <span class="row-title">{{ previousGame.label }}</span>
          <span v-if="resultLabel" class="row-result" :class="'row-result--' + previousGame.game_status">
            {{ resultLabel }}
          </span>
        </div>
        <div class="player-strip">
          <div
            v-for="(player, index) in previousGame.players"
            :key="player.id"
            class="strip-card"
            :class="{ 'strip-card--winner': isWinner(player.role) }"
            :style="{ '--dies-index': index }"
          >
            <div class="strip-avatar">
              <img v-if="player.avatar_url" :src="player.avatar_url" :alt="player.nickname" />
              <div v-else class="strip-avatar-placeholder">
                <IconDefaultAvatar :size="36" />
              </div>
            </div>
            <div class="strip-shade"></div>
            <RoleBadge v-if="player.role" :role="player.role" />
            <div class="strip-info">
              <span class="strip-box-id">{{ player.box_id }}</span>
              <span class="strip-nickname">{{ player.nickname }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Нижний ряд: рассадка предстоящей игры, без ролей. Пустой ряд не
           рисуем: у игры в статусе created игроков может ещё не быть -->
      <section v-if="hasUpcomingSeating" class="dies-row">
        <div class="row-header">
          <span class="row-title">{{ currentGame.label }}</span>
          <span class="row-subtitle">рассадка</span>
        </div>
        <div class="player-strip">
          <div
            v-for="(player, index) in currentGame.players"
            :key="player.id"
            class="strip-card"
            :style="{ '--dies-index': index }"
          >
            <div class="strip-avatar">
              <img v-if="player.avatar_url" :src="player.avatar_url" :alt="player.nickname" />
              <div v-else class="strip-avatar-placeholder">
                <IconDefaultAvatar :size="36" />
              </div>
            </div>
            <div class="strip-shade"></div>
            <div class="strip-info">
              <span class="strip-box-id">{{ player.box_id }}</span>
              <span class="strip-nickname">{{ player.nickname }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import IconDefaultAvatar from '@/components/icons/IconDefaultAvatar.vue'
import RoleBadge from './RoleBadge.vue'

import '@/assets/dies-theme.css'

const props = defineProps({
  event: {
    type: Object,
    default: null
  },
  previousGame: {
    type: Object,
    default: null
  },
  currentGame: {
    type: Object,
    default: null
  }
})

const RESULT_LABELS = {
  civilians_win: 'Победа мирных',
  mafia_win: 'Победа мафии',
  draw: 'Ничья'
}

// Итог прошлой игры всегда финальный, но подпись берём по словарю: статус
// вроде in_progress на битых данных не должен подписать ряд чем попало
const resultLabel = computed(() => RESULT_LABELS[props.previousGame?.game_status] || '')

const WINNING_ROLES = {
  civilians_win: ['civilian', 'sheriff'],
  mafia_win: ['mafia', 'don']
}

// Ничья не подсвечивает никого
const isWinner = (role) => {
  const winners = WINNING_ROLES[props.previousGame?.game_status]
  return Boolean(winners && role && winners.includes(role))
}

// Ролей предстоящей игры на экране быть не должно: раскрытие расклада до
// начала игры ломает игру. Сервер их вырезает, но вёрстка на это не
// полагается - нижний ряд роль не рисует вовсе
const hasUpcomingSeating = computed(() => Boolean(props.currentGame?.players?.length))
</script>

<style scoped>
.dies-between {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  color: #fff;
  font-family: 'Segoe UI', Arial, sans-serif;
}

/* Нейтральная картинка: чёрная сцена, подсвеченная слева зелёным, справа
   фиолетовым - цвета клуба. Движутся только transform и opacity, чтобы
   браузерный источник OBS не пересчитывал раскладку каждый кадр */
.dies-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: radial-gradient(circle at 50% 38%, #121219 0%, #08080c 58%, #050507 100%);
}

.backdrop-glow {
  position: absolute;
  width: 95vw;
  height: 95vw;
  border-radius: 50%;
  will-change: transform, opacity;
}

.backdrop-glow--green {
  left: -38vw;
  top: -30vw;
  background: radial-gradient(
    circle,
    rgba(61, 251, 74, 0.3) 0%,
    rgba(61, 251, 74, 0.12) 34%,
    transparent 68%
  );
  animation: dies-drift-green 26s ease-in-out infinite alternate;
}

.backdrop-glow--purple {
  right: -38vw;
  bottom: -34vw;
  background: radial-gradient(
    circle,
    rgba(167, 67, 255, 0.34) 0%,
    rgba(167, 67, 255, 0.14) 34%,
    transparent 68%
  );
  animation: dies-drift-purple 33s ease-in-out infinite alternate;
}

@keyframes dies-drift-green {
  from { transform: translate3d(0, 0, 0) scale(1); opacity: 0.45; }
  to { transform: translate3d(9vw, 5vh, 0) scale(1.14); opacity: 0.7; }
}

@keyframes dies-drift-purple {
  from { transform: translate3d(0, 0, 0) scale(1.08); opacity: 0.65; }
  to { transform: translate3d(-8vw, -5vh, 0) scale(1); opacity: 0.42; }
}

/* Дымка: косая штриховка, которая очень медленно ползёт поперёк кадра */
.backdrop-haze {
  position: absolute;
  inset: -25%;
  background: repeating-linear-gradient(
    115deg,
    rgba(255, 255, 255, 0.028) 0 2px,
    transparent 2px 16px
  );
  animation: dies-haze 44s linear infinite alternate;
  will-change: transform;
}

@keyframes dies-haze {
  from { transform: translate3d(-3%, 0, 0); }
  to { transform: translate3d(3%, 0, 0); }
}

.backdrop-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 45%, transparent 42%, rgba(0, 0, 0, 0.6) 100%);
}

.dies-between-content {
  position: relative;
  z-index: 1;
  height: 100%;
  box-sizing: border-box;
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
}

.dies-between-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 4px;
}

.event-label {
  font-size: 27px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.75), 0 0 22px var(--dies-purple-glow);
}

.event-table {
  font-size: 15px;
  font-weight: 600;
  padding: 3px 11px;
  border-radius: 6px;
  background: linear-gradient(var(--dies-glass), var(--dies-glass)) padding-box,
              var(--dies-edge) border-box;
  border: 1px solid transparent;
}

.dies-row {
  width: 100%;
  max-width: 1280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.row-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.row-title {
  font-size: 17px;
  font-weight: 600;
  padding: 4px 14px;
  border-radius: 6px;
  background: linear-gradient(var(--dies-glass), var(--dies-glass)) padding-box,
              var(--dies-edge) border-box;
  border: 1px solid transparent;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.8);
}

.row-subtitle {
  font-size: 13px;
  font-weight: 500;
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 1.4px;
}

.row-result {
  font-size: 14px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 6px;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.7);
}

/* Итог - цветом команды: красные и чёрные различаются и здесь */
.row-result--civilians_win {
  background: rgba(198, 40, 40, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 0 16px rgba(198, 40, 40, 0.45);
}

.row-result--mafia_win {
  background: rgba(23, 24, 26, 0.92);
  border: 1px solid var(--dies-purple-soft);
  color: #e6d4ff;
  box-shadow: 0 0 16px var(--dies-purple-glow);
}

.row-result--draw {
  background: rgba(70, 70, 78, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.player-strip {
  display: flex;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.strip-card {
  position: relative;
  flex: 1;
  max-width: 116px;
  min-width: 0;
  aspect-ratio: 5 / 6;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(20, 20, 28, 0.8);
  border: 1px solid rgba(167, 67, 255, 0.16);
  /* Лесенкой: ряд собирается слева направо, когда оверлей появляется */
  animation: dies-card-in 0.55s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  animation-delay: calc(var(--dies-index, 0) * 45ms);
}

@keyframes dies-card-in {
  from { opacity: 0; transform: translate3d(0, 14px, 0) scale(0.97); }
  to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}

/* Победившая команда: неоновое кольцо клуба, которое едва заметно дышит.
   Зелёный не занят ни одной ролью, поэтому читается как «победители»,
   а не как чья-то команда */
.strip-card--winner {
  border-color: var(--dies-green);
  box-shadow: 0 0 0 1px var(--dies-green-soft), 0 0 18px var(--dies-green-glow);
  animation: dies-card-in 0.55s cubic-bezier(0.22, 0.61, 0.36, 1) both,
             dies-winner-pulse 3.4s ease-in-out 1.2s infinite;
}

@keyframes dies-winner-pulse {
  0%, 100% { box-shadow: 0 0 0 1px var(--dies-green-soft), 0 0 14px var(--dies-green-glow); }
  50% { box-shadow: 0 0 0 1px var(--dies-green), 0 0 26px rgba(61, 251, 74, 0.45); }
}

.strip-avatar {
  position: absolute;
  inset: 0;
}

.strip-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.strip-avatar-placeholder {
  width: 100%;
  height: 100%;
  background: rgba(100, 100, 100, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.45);
}

.strip-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.15) 0%,
    rgba(0, 0, 0, 0.05) 30%,
    rgba(0, 0, 0, 0.35) 70%,
    rgba(0, 0, 0, 0.78) 100%
  );
}

.strip-info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 4px;
  padding: 4px 6px 6px;
}

.strip-box-id {
  font-size: 13px;
  font-weight: 700;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.7);
}

.strip-nickname {
  font-size: 11px;
  opacity: 0.88;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.7);
}

/* Зритель, которому движение мешает, получает ту же картинку без движения */
@media (prefers-reduced-motion: reduce) {
  .backdrop-glow,
  .backdrop-haze,
  .strip-card,
  .strip-card--winner {
    animation: none;
  }
}
</style>
