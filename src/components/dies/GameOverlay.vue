<template>
  <div class="dies-overlay">
    <!-- Top section -->
    <div class="dies-top">
      <!-- Top left -->
      <div class="dies-top-left">
        <div class="dies-info-row">
          <div class="dies-title-badge">{{ game.label }}</div>
          <div class="dies-table-badge">{{ game.table_name }}</div>
        </div>
        <div v-if="game.nominated_box_ids?.length" class="dies-nominated">
          На голосовании: {{ game.nominated_box_ids.join(', ') }}
        </div>
        <!-- Separate indicator blocks -->
        <div class="dies-indicators-row">
          <div v-if="game.don_checks?.length" class="indicator-block don-block">
            <IconDon :size="14" class="indicator-block-icon" />
            <span
              v-for="check in game.don_checks"
              :key="'don-' + check.phase_id"
              class="indicator-item"
            >
              {{ check.box_id }}
            </span>
          </div>
          <div v-if="game.sheriff_checks?.length" class="indicator-block sheriff-block">
            <IconSheriff :size="14" class="indicator-block-icon" />
            <span
              v-for="check in game.sheriff_checks"
              :key="'sher-' + check.phase_id"
              class="indicator-item"
              :class="getPlayerTeam(check.role) === 'black' ? 'check-black' : 'check-red'"
            >
              {{ check.box_id }}
            </span>
          </div>
          <div v-if="game.previous_votes?.length" class="indicator-block vote-block">
            <IconVote :size="14" class="indicator-block-icon" />
            <span
              v-for="vote in game.previous_votes"
              :key="'vote-' + vote.phase_id"
              class="indicator-item"
            >
              {{ vote.voted_box_ids.join(', ') }}
            </span>
          </div>
        </div>
      </div>
      <!-- Top right -->
      <div class="dies-top-right">
        <div class="dies-gm-badge">
          <span class="dies-gm-label">Ведущий:</span>
          <span class="dies-gm-name">{{ game.game_master?.nickname }}</span>
        </div>
      </div>
    </div>

    <!-- Bottom section: player cards -->
    <div class="dies-bottom">
      <div class="player-cards">
        <div
          v-for="player in game.players"
          :key="player.id"
          class="player-card"
          :class="{ 'eliminated': !player.is_in_game }"
        >
          <!-- Full-card avatar background -->
          <div class="player-avatar-bg">
            <img v-if="player.avatar_url" :src="player.avatar_url" :alt="player.nickname" />
            <div v-else class="avatar-placeholder">
              <IconDefaultAvatar :size="48" />
            </div>
          </div>
          <div class="player-avatar-overlay"></div>

          <!-- Best move at top of card -->
          <div v-if="player.best_move_box_ids?.length" class="best-move">
            ЛХ {{ player.best_move_box_ids.join(', ') }}
          </div>

          <!-- Role icon (top-right). Роли ещё нет - на договорке она не роздана -
               бейдж не рисуем совсем: цветной бейдж «по умолчанию» назвал бы
               всех мирными и выдал бы расклад, которого сервер не присылал -->
          <RoleBadge v-if="player.role" :role="player.role" />

          <!-- Box ID + Nickname + Status in one row -->
          <div class="player-info-row">
            <span class="player-box-id">{{ player.box_id }}</span>
            <span class="player-nickname" v-fit-text>{{ player.nickname }}</span>
            <span class="player-status">
              <template v-if="player.is_in_game">
                <span
                  v-for="foul in playerFouls(player)"
                  :key="foul.type"
                  class="fouls"
                  :class="'fouls-' + foul.type"
                >{{ foulMarks(foul) }}</span>
              </template>
              <template v-else>
                <img
                  v-if="leaveReasonIcons[player.leave_reason]"
                  :src="leaveReasonIcons[player.leave_reason]"
                  class="leave-icon-img"
                  :class="'leave-' + player.leave_reason"
                  alt="leave"
                />
                <span v-else class="leave-reason">&#x2715;</span>
              </template>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import IconDon from '@/components/icons/IconDon.vue'
import IconSheriff from '@/components/icons/IconSheriff.vue'
import IconVote from '@/components/icons/IconVote.vue'
import IconDefaultAvatar from '@/components/icons/IconDefaultAvatar.vue'
import RoleBadge from './RoleBadge.vue'
// Шериф проверяет команду, а не роль: дон для него такой же чёрный, как мафия
import { getPlayerTeam } from '@/utils/playerHelpers'

import '@/assets/dies-theme.css'

import votedIcon from '@/assets/icons/voted.svg'
import killedIcon from '@/assets/icons/killed.svg'
import disqualifiedIcon from '@/assets/icons/disqualified.svg'

defineProps({
  game: {
    type: Object,
    required: true
  }
})

// Фолы игрока по типам (только ненулевые): [{ type, count }]
const playerFouls = (player) => {
  return (player.fouls || []).filter(f => f.count > 0)
}

// Обычные фолы — «!», прочие типы — первая буква названия (t для tech)
const foulMarks = (foul) => {
  const mark = foul.type === 'regular' ? '!' : foul.type[0]
  return mark.repeat(foul.count)
}

const leaveReasonIcons = {
  killed: killedIcon,
  voted: votedIcon,
  removed: disqualifiedIcon
}

function fitText(el) {
  requestAnimationFrame(() => {
    const max = 11
    const min = 7
    el.style.fontSize = max + 'px'
    let size = max
    while (el.scrollWidth > el.clientWidth && size > min) {
      size -= 0.5
      el.style.fontSize = size + 'px'
    }
  })
}

const vFitText = {
  mounted: fitText,
  updated: fitText
}
</script>

<style scoped>
.dies-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: transparent;
  color: #fff;
  font-family: 'Segoe UI', Arial, sans-serif;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  box-sizing: border-box;
  overflow: hidden;
}

/* Top section */
.dies-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.dies-top-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Game & Table badges with contrasting background */
.dies-info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dies-title-badge {
  font-size: 20px;
  font-weight: 700;
  padding: 4px 14px;
  /* Окантовка в два цвета клуба: заливка идёт по padding-box, градиент по
     border-box - так рамка красится градиентом без лишнего элемента */
  background: linear-gradient(var(--dies-glass), var(--dies-glass)) padding-box,
              var(--dies-edge) border-box;
  border: 1px solid transparent;
  border-radius: 6px;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.8);
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.45);
}

.dies-table-badge {
  font-size: 15px;
  font-weight: 600;
  padding: 5px 12px;
  background: var(--dies-glass);
  border: 1px solid var(--dies-purple-soft);
  border-radius: 6px;
  opacity: 0.92;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
}

.dies-nominated {
  font-size: 14px;
  margin-top: 2px;
  padding: 3px 10px;
  /* Заливка плотная, а не полупрозрачная: плашка лежит поверх произвольного
     кадра, и на светлом видео белый текст по прозрачному фиолетовому
     пропадал. Цвет клубный, контраст держит сама подложка */
  background: rgba(74, 20, 130, 0.88);
  border: 1px solid var(--dies-purple);
  border-radius: 4px;
  display: inline-block;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.75);
  box-shadow: 0 0 14px var(--dies-purple-glow);
}

/* Indicator blocks row */
.dies-indicators-row {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.indicator-block {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 6px;
}

.don-block {
  background: var(--dies-glass-soft);
  border: 1px solid var(--dies-purple-soft);
}

.sheriff-block {
  background: rgba(10, 26, 16, 0.78);
  border: 1px solid var(--dies-green-soft);
}

.vote-block {
  background: var(--dies-glass-soft);
  border: 1px solid var(--dies-hairline);
}

.indicator-block-icon {
  flex-shrink: 0;
  opacity: 0.7;
  color: #fff;
}

.indicator-item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
}

.check-black {
  color: #111;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.4);
}

.check-red {
  color: #ff5252;
}

/* Top right - Game master badge */
.dies-top-right {
  text-align: right;
}

.dies-gm-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  background: linear-gradient(var(--dies-glass), var(--dies-glass)) padding-box,
              var(--dies-edge) border-box;
  border: 1px solid transparent;
  border-radius: 6px;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.45);
}

.dies-gm-label {
  font-size: 13px;
  font-weight: 500;
  opacity: 0.7;
}

.dies-gm-name {
  font-size: 16px;
  font-weight: 600;
}

/* Bottom section: player cards */
.dies-bottom {
  margin-top: auto;
}

.player-cards {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 0 4px;
}

.player-card {
  position: relative;
  flex: 1;
  max-width: 120px;
  min-width: 0;
  aspect-ratio: 5 / 6;
  background: rgba(24, 24, 32, 0.78);
  border: 1px solid rgba(167, 67, 255, 0.18);
  border-radius: 8px;
  padding: 10px 6px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  /* Игрок уходит из игры не рывком: полторы секунды карточка гаснет и
     обесцвечивается. Раньше в переходе стоял только filter, и прозрачность
     прыгала мгновенно */
  transition: filter 1.5s ease, opacity 1.5s ease, transform 1.5s ease,
              border-color 1.5s ease;
  overflow: hidden;
}

.player-card.eliminated {
  filter: grayscale(1) brightness(0.62);
  opacity: 0.72;
  transform: scale(0.985);
  border-color: rgba(255, 255, 255, 0.1);
}

/* Full-card avatar background */
.player-avatar-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.player-avatar-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.player-avatar-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.15) 0%,
    rgba(0, 0, 0, 0.05) 30%,
    rgba(0, 0, 0, 0.3) 70%,
    rgba(0, 0, 0, 0.7) 100%
  );
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: rgba(100, 100, 100, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.45);
}

/* Best move at top of card */
.best-move {
  font-size: 10px;
  font-weight: 700;
  color: #ffd740;
  white-space: nowrap;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
  padding: 1px 6px;
  background: rgba(255, 215, 64, 0.12);
  border-radius: 3px;
  align-self: stretch;
  text-align: center;
  z-index: 2;
}

/* Box ID + Nickname + Status in one row, pinned to card bottom */
.player-info-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  align-self: stretch;
  margin-top: auto;
  gap: 3px;
  padding: 0 2px;
  z-index: 2;
}

.player-box-id {
  font-size: 13px;
  font-weight: 700;
  justify-self: start;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.6);
}

.player-nickname {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.85;
  min-width: 0;
  text-align: center;
}

.player-status {
  justify-self: end;
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
}

.fouls {
  color: #ff5252;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
}

.fouls-tech {
  color: #b37feb;
}

.fouls + .fouls {
  margin-left: 4px;
}

.leave-icon-img {
  width: 16px;
  height: 16px;
  filter: brightness(0) invert(1);
  animation: dies-leave-in 1.1s ease both;
}

.leave-reason {
  animation: dies-leave-in 1.1s ease both;
}

@keyframes dies-leave-in {
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
}

.leave-icon-img.leave-killed {
  filter: brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(-10deg);
}

.leave-icon-img.leave-voted {
  filter: brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(30deg);
}

.leave-icon-img.leave-removed {
  filter: brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(-10deg);
}

.leave-reason {
  font-size: 14px;
  color: #ff5252;
}

@media (prefers-reduced-motion: reduce) {
  .leave-icon-img,
  .leave-reason {
    animation: none;
  }
}
</style>
