<template>
  <div class="dies-overlay">
    <!-- Top section -->
    <div class="dies-top">
      <!-- Top left -->
      <div class="dies-top-left">
        <div class="dies-title">{{ game.label }}</div>
        <div class="dies-table">{{ game.table_name }}</div>
        <div v-if="game.nominated_box_ids?.length" class="dies-nominated">
          На голосовании: {{ game.nominated_box_ids.join(', ') }}
        </div>
        <!-- Compact checks/votes indicators -->
        <div class="dies-indicators">
          <span
            v-for="check in game.don_checks"
            :key="'don-' + check.phase_id"
            class="indicator-badge don-badge"
            :title="'Дон проверил ' + check.box_id"
          >
            <img :src="donIcon" class="indicator-icon-img" alt="don" />
            {{ check.box_id }}
            <span :class="check.is_sheriff ? 'check-hit' : 'check-miss'">{{ check.is_sheriff ? '+' : '-' }}</span>
          </span>
          <span
            v-for="check in game.sheriff_checks"
            :key="'sher-' + check.phase_id"
            class="indicator-badge sheriff-badge"
            :title="'Шериф проверил ' + check.box_id"
          >
            <img :src="sheriffIcon" class="indicator-icon-img" alt="sheriff" />
            {{ check.box_id }}
            <span :class="check.role === 'mafia' ? 'check-hit' : 'check-miss'">{{ check.role === 'mafia' ? '+' : '-' }}</span>
          </span>
          <span
            v-for="vote in game.previous_votes"
            :key="'vote-' + vote.phase_id"
            class="indicator-badge vote-badge"
            :title="'Голосование ' + vote.phase_id"
          >
            <img :src="thumbsupIcon" class="indicator-icon-img" alt="vote" />
            {{ vote.voted_box_ids.join(',') }}
          </span>
        </div>
      </div>
      <!-- Top right -->
      <div class="dies-top-right">
        <div class="dies-gm">{{ game.game_master?.nickname }}</div>
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
          <!-- Best move indicator above card -->
          <div v-if="player.best_move_box_ids?.length" class="best-move">
            ЛХ {{ player.best_move_box_ids.join(', ') }}
          </div>

          <!-- Role icon (top-right), hidden if best_move -->
          <div v-if="!player.best_move_box_ids?.length" class="role-badge" :class="'role-' + player.role">
            <img :src="getRoleIcon(player.role)" class="role-icon-img" alt="role" />
          </div>

          <!-- Avatar -->
          <div class="player-avatar">
            <img v-if="player.avatar_url" :src="player.avatar_url" :alt="player.nickname" />
            <div v-else class="avatar-placeholder">
              <span>{{ player.box_id }}</span>
            </div>
          </div>

          <!-- Box ID -->
          <div class="player-box-id">{{ player.box_id }}</div>
          <!-- Nickname -->
          <div class="player-nickname">{{ player.nickname }}</div>

          <!-- Bottom-right: fouls or leave reason -->
          <div class="player-status-corner">
            <template v-if="player.is_in_game">
              <span v-if="player.fouls > 0" class="fouls">{{ '!'.repeat(player.fouls) }}</span>
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

import donIcon from '@/assets/icons/don.svg'
import sheriffIcon from '@/assets/icons/sheriff.svg'
import pistolIcon from '@/assets/icons/pistol.svg'
import citizenIcon from '@/assets/icons/citizen.svg'
import thumbsupIcon from '@/assets/icons/thumbsup.svg'
import votedIcon from '@/assets/icons/voted.svg'
import killedIcon from '@/assets/icons/killed.svg'
import disqualifiedIcon from '@/assets/icons/disqualified.svg'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

// Placeholder data — will be replaced with API logic later
const game = ref({
  label: '',
  table_name: '',
  nominated_box_ids: [],
  previous_votes: [],
  game_master: { nickname: '', id: '' },
  players: [],
  don_checks: [],
  sheriff_checks: []
})

const roleIconMap = {
  don: donIcon,
  sheriff: sheriffIcon,
  mafia: pistolIcon,
  civilian: citizenIcon
}

const getRoleIcon = (role) => {
  return roleIconMap[role] || citizenIcon
}

const leaveReasonIcons = {
  killed: killedIcon,
  voted: votedIcon,
  removed: disqualifiedIcon
}
</script>

<style>
/* Global styles for transparent OBS overlay */
.dies-overlay ~ *,
body:has(.dies-overlay),
html:has(.dies-overlay) {
  background: transparent !important;
}
</style>

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
  gap: 4px;
}

.dies-title {
  font-size: 24px;
  font-weight: 700;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.6);
}

.dies-table {
  font-size: 16px;
  font-weight: 500;
  opacity: 0.85;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
}

.dies-nominated {
  font-size: 14px;
  margin-top: 4px;
  padding: 2px 8px;
  background: rgba(255, 152, 0, 0.6);
  border-radius: 4px;
  display: inline-block;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.6);
}

/* Compact indicators for checks/votes */
.dies-indicators {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.indicator-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-shadow: none;
}

.indicator-icon-img {
  width: 14px;
  height: 14px;
  filter: brightness(0) invert(1);
  flex-shrink: 0;
}

.don-badge {
  background: rgba(33, 33, 33, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.sheriff-badge {
  background: rgba(13, 71, 161, 0.7);
  border: 1px solid rgba(100, 181, 246, 0.5);
}

.vote-badge {
  background: rgba(56, 56, 56, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.check-hit {
  color: #69f0ae;
}

.check-miss {
  color: #ff5252;
}

/* Top right */
.dies-top-right {
  text-align: right;
}

.dies-gm {
  font-size: 16px;
  font-weight: 600;
  opacity: 0.85;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
}

/* Bottom section: player cards */
.dies-bottom {
  margin-top: auto;
}

.player-cards {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.player-card {
  position: relative;
  width: 90px;
  background: rgba(30, 30, 30, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: filter 0.3s ease;
}

.player-card.eliminated {
  filter: grayscale(1);
  opacity: 0.7;
}

/* Best move indicator above card */
.best-move {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 700;
  color: #ffd740;
  white-space: nowrap;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
}

/* Role badge (top-right of card) */
.role-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(80, 80, 80, 0.8);
}

.role-icon-img {
  width: 14px;
  height: 14px;
  filter: brightness(0) invert(1);
}

.role-mafia {
  background: rgba(183, 28, 28, 0.85);
}

.role-don {
  background: rgba(30, 30, 30, 0.9);
  border: 1px solid #ffd740;
}

.role-don .role-icon-img {
  filter: brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(15deg);
}

.role-sheriff {
  background: rgba(13, 71, 161, 0.85);
  border: 1px solid #64b5f6;
}

.role-civilian {
  background: rgba(46, 125, 50, 0.75);
}

/* Avatar */
.player-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.player-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: rgba(100, 100, 100, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
}

.player-box-id {
  font-size: 14px;
  font-weight: 700;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.6);
}

.player-nickname {
  font-size: 11px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
  opacity: 0.85;
}

/* Fouls / leave reason (bottom-right of card) */
.player-status-corner {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 12px;
  font-weight: 700;
}

.fouls {
  color: #ff5252;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
}

.leave-icon-img {
  width: 16px;
  height: 16px;
  filter: brightness(0) invert(1);
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
</style>
