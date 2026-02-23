<template>
  <div class="dies-overlay">
    <!-- Error display -->
    <div v-if="error" class="dies-error">{{ error }}</div>

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
              :class="check.role === 'mafia' ? 'check-black' : 'check-red'"
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

          <!-- Role icon (top-right) -->
          <div class="role-badge">
            <component :is="roleIconComponent(player.role)" :size="14" class="role-icon-svg" />
          </div>

          <!-- Box ID + Nickname + Status in one row -->
          <div class="player-info-row">
            <span class="player-box-id">{{ player.box_id }}</span>
            <span class="player-nickname" v-fit-text>{{ player.nickname }}</span>
            <span class="player-status">
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
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

import IconDon from '@/components/icons/IconDon.vue'
import IconSheriff from '@/components/icons/IconSheriff.vue'
import IconMafia from '@/components/icons/IconMafia.vue'
import IconCivilian from '@/components/icons/IconCivilian.vue'
import IconVote from '@/components/icons/IconVote.vue'
import IconDefaultAvatar from '@/components/icons/IconDefaultAvatar.vue'

import votedIcon from '@/assets/icons/voted.svg'
import killedIcon from '@/assets/icons/killed.svg'
import disqualifiedIcon from '@/assets/icons/disqualified.svg'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

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

const error = ref(null)

let ws = null
let rpcId = 0
let resubscribeTimerId = null
let reconnectTimerId = null
let intentionallyClosed = false

const RECONNECT_DELAY_MS = 3000

function getWsUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
  const url = new URL(baseUrl)
  const proto = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${url.host}${url.pathname}/ws`
}

function sendSubscribe() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[WS] sendSubscribe called but socket not open, readyState:', ws?.readyState)
    return
  }
  rpcId++
  const payload = {
    jsonrpc: '2.0',
    method: 'subscribe_to_game_info',
    params: { game_id: props.id },
    id: rpcId
  }
  console.log('[WS] Sending subscribe:', JSON.stringify(payload))
  ws.send(JSON.stringify(payload))
}

function scheduleResubscribe(expiresAtTimestamp) {
  clearResubscribeTimer()
  const nowMs = Date.now()
  const expiresAtMs = expiresAtTimestamp * 1000
  const delayMs = Math.max(expiresAtMs - nowMs - 1000, 0)
  console.log(`[WS] Scheduling resubscribe in ${delayMs}ms (expires_at: ${expiresAtTimestamp}, now: ${nowMs / 1000})`)
  resubscribeTimerId = setTimeout(() => {
    console.log('[WS] Resubscribe timer fired')
    sendSubscribe()
  }, delayMs)
}

function clearResubscribeTimer() {
  if (resubscribeTimerId !== null) {
    clearTimeout(resubscribeTimerId)
    resubscribeTimerId = null
  }
}

function clearReconnectTimer() {
  if (reconnectTimerId !== null) {
    clearTimeout(reconnectTimerId)
    reconnectTimerId = null
  }
}

function connect() {
  clearReconnectTimer()
  error.value = null

  const url = getWsUrl()
  console.log('[WS] Connecting to:', url)
  ws = new WebSocket(url)

  ws.onopen = () => {
    console.log('[WS] Connection opened')
    sendSubscribe()
  }

  ws.onmessage = (event) => {
    console.log('[WS] Message received:', event.data)
    let msg
    try {
      msg = JSON.parse(event.data)
    } catch (e) {
      console.error('[WS] Failed to parse message:', e)
      return
    }

    if (msg.error) {
      const errMsg = msg.error.message || msg.error.data || 'Unknown error'
      console.error('[WS] RPC error:', msg.error)
      if (/not found/i.test(errMsg)) {
        error.value = 'Игра не найдена'
      } else {
        error.value = errMsg
      }
      return
    }

    if (msg.method === 'game_state' && msg.params) {
      console.log('[WS] game_state notification received')
      game.value = msg.params
      error.value = null
      return
    }

    if (msg.result) {
      console.log('[WS] RPC result, game:', !!msg.result.game, 'expires_in:', msg.result.subscription_expired_in)
      if (msg.result.game) {
        game.value = msg.result.game
        error.value = null
      }
      if (msg.result.subscription_expired_in) {
        scheduleResubscribe(msg.result.subscription_expired_in)
      }
    }
  }

  ws.onclose = (event) => {
    console.warn('[WS] Connection closed, code:', event.code, 'reason:', event.reason, 'wasClean:', event.wasClean)
    clearResubscribeTimer()
    if (intentionallyClosed) {
      console.log('[WS] Intentionally closed, not reconnecting')
      return
    }

    if (event.code === 1008 || event.code === 1013) {
      error.value = 'Превышен лимит подключений. Попробуйте позже.'
      return
    }

    console.log(`[WS] Will reconnect in ${RECONNECT_DELAY_MS}ms`)
    reconnectTimerId = setTimeout(() => {
      console.log('[WS] Reconnecting...')
      connect()
    }, RECONNECT_DELAY_MS)
  }

  ws.onerror = (event) => {
    console.error('[WS] Error:', event)
  }
}

onMounted(() => {
  console.log('[WS] onMounted, game_id:', props.id)
  connect()
})

onUnmounted(() => {
  console.log('[WS] onUnmounted, closing connection')
  intentionallyClosed = true
  clearResubscribeTimer()
  clearReconnectTimer()
  if (ws) {
    ws.close()
    ws = null
  }
})

const roleComponentMap = {
  don: IconDon,
  sheriff: IconSheriff,
  mafia: IconMafia,
  civilian: IconCivilian
}

const roleIconComponent = (role) => {
  return roleComponentMap[role] || IconCivilian
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
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.8);
}

.dies-table-badge {
  font-size: 15px;
  font-weight: 600;
  padding: 5px 12px;
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  opacity: 0.9;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
}

.dies-nominated {
  font-size: 14px;
  margin-top: 2px;
  padding: 3px 10px;
  background: rgba(255, 152, 0, 0.6);
  border-radius: 4px;
  display: inline-block;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.6);
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
  background: rgba(33, 33, 33, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.sheriff-block {
  background: rgba(13, 50, 100, 0.75);
  border: 1px solid rgba(100, 181, 246, 0.35);
}

.vote-block {
  background: rgba(50, 50, 50, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
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
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
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
  background: rgba(30, 30, 30, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 10px 6px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: filter 0.3s ease;
  overflow: hidden;
}

.player-card.eliminated {
  filter: grayscale(1);
  opacity: 0.7;
}

/* Role badge (top-right of card) — monochrome white */
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
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
  z-index: 2;
}

.role-icon-svg {
  flex-shrink: 0;
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

.dies-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(183, 28, 28, 0.85);
  color: #fff;
  padding: 16px 32px;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  z-index: 10;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
}
</style>
