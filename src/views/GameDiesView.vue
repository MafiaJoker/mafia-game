<template>
  <div class="dies-root">
    <!-- Error display -->
    <div v-if="error" class="dies-error">{{ error }}</div>

    <GameOverlay :game="game" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

import GameOverlay from '@/components/dies/GameOverlay.vue'

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
</script>

<style scoped>
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
