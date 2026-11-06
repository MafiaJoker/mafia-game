// Звук плашки мероприятия в OBS (#132): днём микрофон, на договорке, ночью и
// между играми - музыка. Что звучит, решает сервер полем microphone_enabled,
// плашка только исполняет. Глушить чужие источники страница в OBS не может,
// поэтому микрофоном она управляет через obs-websocket - сервер, встроенный в
// OBS с 28-й версии. Музыку играет сама: obs-browser пускает звук без клика
import { onMounted, onUnmounted } from 'vue'
import { apiService } from '@/services/api.js'

const OBS_URL = 'ws://127.0.0.1:4455'
const OBS_RECONNECT_DELAY_MS = 5000
const FADE_MS = 1500
const FADE_STEP_MS = 50

const OBS_OP = { HELLO: 0, IDENTIFY: 1, IDENTIFIED: 2, REQUEST: 6, REQUEST_RESPONSE: 7 }

// Галочку «Control audio via OBS» плашка ставит сама, и OBS от этого
// пересоздаёт источник - страница грузится заново. Метка говорит новой
// загрузке, что галочку уже ставили: если она так и не встала, второй раз её
// не трогаем, иначе плашка перезагружалась бы в эфире по кругу
const REROUTE_FIX_KEY_PREFIX = 'dies_reroute_audio_fix:'

// Пароль и микрофоны живут во фрагменте ссылки: он не уходит на сервер и в
// логи nginx. Пары разделяет & (так ссылку собирает страница мероприятия)
// или # (так к готовой ссылке руками допишут #mic=)
export function parseSoundParams(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, '').replaceAll('#', '&'))
  const password = params.get('obs')
  if (!password) return null
  const mics = (params.get('mic') || '').split(',').map((name) => name.trim()).filter(Boolean)
  return { password, mics }
}

const sha256Base64 = async (text) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
}

// Вход в obs-websocket 5: base64(sha256(base64(sha256(пароль + соль)) + вызов))
export async function obsAuthentication(password, { salt, challenge }) {
  return sha256Base64(await sha256Base64(password + salt) + challenge)
}

// Адрес страницы без фрагмента: в нём пароль, а записать его кодировку OBS
// и браузер могут по-разному
const pageAddress = (url) => {
  try {
    const parsed = new URL(url)
    return parsed.origin + parsed.pathname + parsed.search
  } catch {
    return null
  }
}

export function useBroadcastSound() {
  const params = parseSoundParams(window.location.hash)
  // Без пароля в ссылке плашка молчит и микрофон не трогает: уже настроенные
  // эфиры после деплоя не должны внезапно заиграть музыку
  if (!params) return { applyMicrophone: () => {} }

  const audio = new Audio()
  audio.volume = 0
  // Ссылка трека ровно такой, какой её отдал сервер: с ней он сравнивает exclude
  let track = null
  let trackLoading = null

  // Последний флаг сервера и то, как плашка держит микрофон сейчас. Это не
  // одно и то же: переход к микрофону включает его только после затухания музыки
  let microphoneEnabled = null
  let micMuted = null
  // Номер перехода: новый обрывает затухание прежнего
  let transition = 0

  let obs = null
  let obsReady = false
  let obsRequestId = 0
  const obsPending = new Map()
  let obsQueue = Promise.resolve()
  let micInputs = []
  let rerouteChecked = false
  let reconnectTimerId = null
  let stopped = false

  const obsRequest = (requestType, requestData) => new Promise((resolve, reject) => {
    if (!obsReady) {
      reject(new Error('OBS is not connected'))
      return
    }
    const requestId = String(++obsRequestId)
    obsPending.set(requestId, { resolve, reject })
    obs.send(JSON.stringify({ op: OBS_OP.REQUEST, d: { requestType, requestId, requestData } }))
  })

  // Микрофон выставляется на каждом пуше и после каждого подключения: ручное
  // переключение в OBS - сломанное состояние, и первый же пуш его исправит.
  // Запросы идут по одному: obs-websocket разбирает их параллельно и мог бы
  // выполнить «включить» позже следующего за ним «заглушить»
  const holdMic = () => {
    if (!obsReady || micMuted === null) return
    const inputMuted = micMuted
    obsQueue = obsQueue.then(() => Promise.all(micInputs.map((inputName) => (
      obsRequest('SetInputMute', { inputName, inputMuted })
        .catch((error) => console.error('[OBS] SetInputMute failed:', inputName, error.message))
    ))))
  }

  // Без галочки «Control audio via OBS» музыка уходит в колонки ПК, а не в
  // микшер OBS. Свой источник страница находит по ссылке: имени источника
  // obs-browser ей не сообщает
  const ensureAudioRerouted = async () => {
    const ownAddress = pageAddress(window.location.href)
    const { inputs } = await obsRequest('GetInputList', { inputKind: 'browser_source' })
    for (const { inputName } of inputs) {
      const { inputSettings } = await obsRequest('GetInputSettings', { inputName })
      if (pageAddress(inputSettings.url) !== ownAddress) continue
      const fixKey = REROUTE_FIX_KEY_PREFIX + inputName
      if (inputSettings.reroute_audio) {
        localStorage.removeItem(fixKey)
      } else if (localStorage.getItem(fixKey)) {
        localStorage.removeItem(fixKey)
        console.warn('[OBS] Control audio via OBS is still off after the fix:', inputName)
      } else {
        localStorage.setItem(fixKey, '1')
        console.log('[OBS] Turning on Control audio via OBS:', inputName)
        await obsRequest('SetInputSettings', { inputName, inputSettings: { reroute_audio: true } })
      }
    }
  }

  const onObsReady = async () => {
    console.log('[OBS] Connected')
    try {
      // По умолчанию - глобальный Mic/Aux, если в ссылке не перечислены свои
      micInputs = params.mics.length
        ? params.mics
        : [(await obsRequest('GetSpecialInputs')).mic1].filter(Boolean)
    } catch (error) {
      console.error('[OBS] GetSpecialInputs failed:', error.message)
      micInputs = []
    }
    if (!micInputs.length) console.warn('[OBS] No microphone to control: Mic/Aux is not set in OBS')
    holdMic()

    if (rerouteChecked) return
    rerouteChecked = true
    try {
      await ensureAudioRerouted()
    } catch (error) {
      console.error('[OBS] Control audio check failed:', error.message)
    }
  }

  const handleObsMessage = async (socket, { op, d }) => {
    if (op === OBS_OP.HELLO) {
      const identify = { rpcVersion: 1, eventSubscriptions: 0 }
      if (d.authentication) {
        identify.authentication = await obsAuthentication(params.password, d.authentication)
      }
      socket.send(JSON.stringify({ op: OBS_OP.IDENTIFY, d: identify }))
    } else if (op === OBS_OP.IDENTIFIED) {
      obsReady = true
      await onObsReady()
    } else if (op === OBS_OP.REQUEST_RESPONSE) {
      const pending = obsPending.get(d.requestId)
      if (!pending) return
      obsPending.delete(d.requestId)
      if (d.requestStatus.result) {
        pending.resolve(d.responseData || {})
      } else {
        pending.reject(new Error(`${d.requestType}: ${d.requestStatus.code} ${d.requestStatus.comment || ''}`))
      }
    }
  }

  // OBS недоступен - плашка показывает игру как обычно: ошибка только в
  // консоли, баннеров в эфире нет, переподключение каждые несколько секунд
  const scheduleObsReconnect = () => {
    if (stopped) return
    reconnectTimerId = setTimeout(connectObs, OBS_RECONNECT_DELAY_MS)
  }

  const connectObs = () => {
    reconnectTimerId = null
    let socket
    try {
      socket = new WebSocket(OBS_URL, 'obswebsocket.json')
    } catch (error) {
      console.error('[OBS] Cannot open WebSocket:', error)
      scheduleObsReconnect()
      return
    }
    obs = socket
    // Например, WebCrypto нет на странице по http с адреса в локальной сети
    socket.onmessage = (event) => handleObsMessage(socket, JSON.parse(event.data)).catch((error) => {
      console.error('[OBS] Failed to handle message:', error)
      socket.close()
    })
    socket.onclose = (event) => {
      obsReady = false
      for (const { reject } of obsPending.values()) reject(new Error('OBS connection closed'))
      obsPending.clear()
      if (stopped) return
      // 4009 - пароль в ссылке не совпал с паролем OBS
      console.error('[OBS] Connection closed, code:', event.code, event.reason)
      scheduleObsReconnect()
    }
  }

  // Один запрос на всех: трек кончился ровно на переходе к музыке - второй
  // не нужен
  const loadTrack = (exclude) => {
    trackLoading ??= apiService.getRandomBroadcastTrack(exclude)
      .then(({ url }) => {
        track = url
        audio.src = url
      })
      .catch((error) => {
        // 404 - музыки нет: плашка молчит, а микрофон переключает как обычно.
        // Следующий переход к музыке спросит снова
        console.warn('[Music] No track:', error.response?.status ?? error.message)
      })
      .finally(() => {
        trackLoading = null
      })
    return trackLoading
  }

  const playMusic = () => {
    audio.play().catch((error) => console.warn('[Music] Play failed:', error.message))
  }

  // Громкость считаем по часам, а не по шагам: таймеры скрытой страницы
  // троттлятся, а микрофон после затухания должен включиться вовремя
  const fade = (target, current) => new Promise((resolve) => {
    const from = audio.volume
    const startedAt = Date.now()
    const step = () => {
      if (current !== transition) {
        resolve(false)
        return
      }
      const progress = Math.min((Date.now() - startedAt) / FADE_MS, 1)
      audio.volume = from + (target - from) * progress
      if (progress < 1) setTimeout(step, FADE_STEP_MS)
      else resolve(true)
    }
    step()
  })

  // К музыке: микрофон глушится сразу, музыка нарастает
  const switchToMusic = async () => {
    const current = ++transition
    micMuted = true
    holdMic()
    if (!track) await loadTrack()
    if (current !== transition || !track) return
    playMusic()
    await fade(1, current)
  }

  // К микрофону: музыка затухает и встаёт на паузу - потом продолжится с того
  // же места, - и только тогда включается микрофон
  const switchToMic = async () => {
    const current = ++transition
    if (!audio.paused) {
      if (!(await fade(0, current))) return
      audio.pause()
    }
    micMuted = false
    holdMic()
  }

  audio.addEventListener('ended', async () => {
    const finished = track
    track = null
    await loadTrack(finished)
    if (!stopped && microphoneEnabled === false && track) playMusic()
  })

  // Трек удалили из бакета или он битый: следующий переход к музыке возьмёт
  // другой. Сразу не просим - иначе без сети запросы пошли бы по кругу
  audio.addEventListener('error', () => {
    console.error('[Music] Track failed to play:', track)
    track = null
  })

  const applyMicrophone = (enabled) => {
    // Сервер без флага (до MafiaJoker/backend#237) звук не решает - не трогаем
    if (typeof enabled !== 'boolean') return
    if (enabled === microphoneEnabled) {
      holdMic()
      return
    }
    microphoneEnabled = enabled
    if (enabled) switchToMic()
    else switchToMusic()
  }

  onMounted(connectObs)

  onUnmounted(() => {
    stopped = true
    transition++
    clearTimeout(reconnectTimerId)
    obs?.close()
    audio.pause()
  })

  return { applyMicrophone }
}
