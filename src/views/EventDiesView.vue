<template>
  <div class="dies-root">
    <!-- Ошибка лежит поверх картинки, а не вместо неё: пустой чёрный экран
         в эфире недопустим даже тогда, когда подписка не удалась -->
    <div v-if="error" class="dies-error">{{ error }}</div>

    <!-- Игровой оверлей и межигровой - это два блока внутри одной открытой
         страницы: переключение по on_air не перезагружает её и не моргает.
         Оба лежат fixed поверх всего экрана, поэтому на время перехода
         накладываются друг на друга и сменяются наплывом, а не стыком -->
    <Transition name="dies-swap">
      <GameOverlay v-if="onAir && currentGame" key="game" :game="currentGame" />
      <BetweenGamesOverlay
        v-else
        key="between"
        :event="eventInfo"
        :previous-game="previousGame"
        :current-game="currentGame"
      />
    </Transition>
  </div>
</template>

<script setup>
import GameOverlay from '@/components/dies/GameOverlay.vue'
import BetweenGamesOverlay from '@/components/dies/BetweenGamesOverlay.vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

const route = useRoute()

const eventInfo = ref(null)
const onAir = ref(false)
const currentGame = ref(null)
const previousGame = ref(null)
const error = ref(null)

// Стол подписки. Начинаем с того, что в ссылке, а дальше держим тот, который
// вернул сервер: мероприятие может начаться с одним столом и обзавестись
// вторым посреди эфира, и переподписка без стола вернула бы -32004
const tableIdFromQuery = Number.parseInt(route.query.table, 10)
let subscriptionTableId = Number.isNaN(tableIdFromQuery) ? null : tableIdFromQuery

let ws = null
let rpcId = 0
let resubscribeTimerId = null
let reconnectTimerId = null
let subscribeRetryTimerId = null
let subscribeRetryIndex = 0
let intentionallyClosed = false

const RECONNECT_DELAY_MS = 3000

// RPC-ошибка не рвёт сокет, поэтому реконнект на неё не сработает: без
// собственных ретраев одна неудачная переподписка оставила бы эфир без
// обновлений до конца вечера. Задержки короткие - промах чаще всего
// мгновенный (стол ещё не заведён, база моргнула)
const SUBSCRIBE_RETRY_DELAYS_MS = [100, 500, 1000]

const RPC_ERROR_MESSAGES = {
  '-32002': () => 'Мероприятие не найдено',
  '-32003': () => 'Превышен лимит подключений. Попробуйте позже.',
  '-32004': (data) => `Укажите стол в ссылке: ${(data?.table_ids || []).join(', ')}`,
  '-32005': () => 'На мероприятии есть игры и со столом, и без стола'
}

function getWsUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
  const url = new URL(baseUrl)
  const proto = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${url.host}${url.pathname}/ws`
}

function applyState(state) {
  eventInfo.value = state.event || null
  onAir.value = Boolean(state.on_air)
  currentGame.value = state.current_game || null
  previousGame.value = state.previous_game || null
  error.value = null
}

function sendSubscribe() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[WS] sendSubscribe called but socket not open, readyState:', ws?.readyState)
    return
  }
  rpcId++
  const params = { event_id: props.id }
  if (subscriptionTableId !== null) {
    params.table_id = subscriptionTableId
  }
  const payload = {
    jsonrpc: '2.0',
    method: 'subscribe_to_event_info',
    params,
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

function scheduleSubscribeRetry() {
  clearSubscribeRetryTimer()
  if (subscribeRetryIndex >= SUBSCRIBE_RETRY_DELAYS_MS.length) {
    console.warn('[WS] Subscribe retries exhausted, giving up until reconnect')
    return
  }
  const delayMs = SUBSCRIBE_RETRY_DELAYS_MS[subscribeRetryIndex]
  subscribeRetryIndex++
  console.log(`[WS] Scheduling subscribe retry #${subscribeRetryIndex} in ${delayMs}ms`)
  subscribeRetryTimerId = setTimeout(() => {
    subscribeRetryTimerId = null
    sendSubscribe()
  }, delayMs)
}

function clearSubscribeRetryTimer() {
  if (subscribeRetryTimerId !== null) {
    clearTimeout(subscribeRetryTimerId)
    subscribeRetryTimerId = null
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
  clearSubscribeRetryTimer()
  subscribeRetryIndex = 0
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
      console.error('[WS] RPC error:', msg.error)
      const describe = RPC_ERROR_MESSAGES[String(msg.error.code)]
      error.value = describe
        ? describe(msg.error.data)
        : (msg.error.message || 'Не удалось подписаться на мероприятие')
      scheduleSubscribeRetry()
      return
    }

    if (msg.method === 'event_state' && msg.params) {
      console.log('[WS] event_state notification received, on_air:', msg.params.on_air)
      applyState(msg.params)
      return
    }

    if (msg.result) {
      // Подписка удалась - бюджет коротких ретраев начинается заново
      clearSubscribeRetryTimer()
      subscribeRetryIndex = 0

      // Состояние и срок подписки - независимые части ответа: продление может
      // прийти без блока event, и это не повод остаться без нового таймера
      if (msg.result.event) {
        console.log(
          '[WS] RPC result, on_air:', msg.result.on_air,
          'table_id:', msg.result.event.table_id,
          'expires_in:', msg.result.subscription_expired_in
        )
        applyState(msg.result)
        // Стол закреплён за подпиской сервером - переподписываемся именно им
        subscriptionTableId = msg.result.event.table_id ?? null
      }

      if (msg.result.subscription_expired_in) {
        scheduleResubscribe(msg.result.subscription_expired_in)
      }
    }
  }

  ws.onclose = (event) => {
    console.warn('[WS] Connection closed, code:', event.code, 'reason:', event.reason, 'wasClean:', event.wasClean)
    clearResubscribeTimer()
    clearSubscribeRetryTimer()
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
  console.log('[WS] onMounted, event_id:', props.id, 'table_id:', subscriptionTableId)
  connect()
})

onUnmounted(() => {
  console.log('[WS] onUnmounted, closing connection')
  intentionallyClosed = true
  clearResubscribeTimer()
  clearReconnectTimer()
  clearSubscribeRetryTimer()
  if (ws) {
    ws.close()
    ws = null
  }
})
</script>

<style>
/* Не scoped: классы перехода Vue вешает на корень дочернего компонента */
.dies-swap-enter-active {
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.dies-swap-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.dies-swap-enter-from {
  opacity: 0;
  transform: scale(1.015);
}

.dies-swap-leave-to {
  opacity: 0;
  transform: scale(0.99);
}

@media (prefers-reduced-motion: reduce) {
  .dies-swap-enter-active,
  .dies-swap-leave-active {
    transition-duration: 0.01s;
  }
}
</style>

<style scoped>
.dies-error {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(183, 28, 28, 0.85);
  color: #fff;
  padding: 12px 28px;
  border-radius: 8px;
  font-size: 17px;
  font-weight: 600;
  text-align: center;
  z-index: 10;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
}
</style>
