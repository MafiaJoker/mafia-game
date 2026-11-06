// Звук плашки мероприятия (#132): что звучит, решает сервер полем
// microphone_enabled, плашка только исполняет - глушит микрофон в OBS через
// obs-websocket и играет музыку. Без пароля OBS в ссылке молчит, как раньше

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { createHash } from 'node:crypto'
import EventDiesView from '@/views/EventDiesView.vue'
import { apiService } from '@/services/api.js'

vi.mock('@/services/api.js', () => ({
  apiService: { getRandomBroadcastTrack: vi.fn() }
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => ({ query: { table: '1' } })
}))

const EVENT_ID = '13200001-0000-4000-8000-000000000001'
const PAGE_PATH = `/event/${EVENT_ID}/dies?table=1`
const OBS_URL = 'ws://127.0.0.1:4455'
// & в пароле - проверка, что пароль не рвётся на разборе фрагмента
const PASSWORD = 'клуб&пароль'
const SOUND_HASH = `#obs=${encodeURIComponent(PASSWORD)}`
const SALT = 'lM1GncleQOaCu9lT1yeUZhFYnqhsLLP1G5lAGo3ixaI='
const CHALLENGE = '+IxH4CnCiqpX1rM9scsNynZzbOe4KhDeYcTNS3PDaeY='
const TRACK_A = 'https://music.jokermafia.am/Night%20One.mp3'
const TRACK_B = 'https://music.jokermafia.am/second.mp3'
const FADE_MS = 1500
const OBS_RECONNECT_MS = 5000

const sha256Base64 = (text) => createHash('sha256').update(text).digest('base64')

class FakeSocket {
  static OPEN = 1
  static instances = []

  constructor(url, protocol) {
    Object.assign(this, { url, protocol, readyState: 0 })
    FakeSocket.instances.push(this)
  }

  send(data) {
    this.server?.(JSON.parse(data))
  }

  close(code = 1000) {
    if (this.readyState === 3) return
    this.readyState = 3
    this.onclose?.({ code, reason: '' })
  }

  receive(message) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }
}

class FakeAudio extends EventTarget {
  static instances = []

  constructor() {
    super()
    Object.assign(this, { src: '', paused: true, volume: 1 })
    FakeAudio.instances.push(this)
  }

  play() {
    this.paused = false
    return Promise.resolve()
  }

  pause() {
    this.paused = true
  }

  // Трек доиграл: браузер ставит паузу и шлёт ended
  finish() {
    this.paused = true
    this.dispatchEvent(new Event('ended'))
  }
}

// OBS с включённым сервером WebSocket: проверяет вход по правилу
// obs-websocket 5 и отвечает на запросы плашки
const startObs = (socket, { password = PASSWORD, mic1 = 'Mic/Aux', sources = {} } = {}) => {
  const obs = { muted: {}, requests: [], identifyReceived: false }
  const respond = (d, responseData) => queueMicrotask(() => socket.receive({
    op: 7,
    d: { requestType: d.requestType, requestId: d.requestId, requestStatus: { result: true, code: 100 }, responseData }
  }))
  socket.server = ({ op, d }) => {
    if (op === 1) {
      obs.identifyReceived = true
      const expected = sha256Base64(sha256Base64(password + SALT) + CHALLENGE)
      // 4009 - AuthenticationFailed
      queueMicrotask(() => (d.authentication === expected
        ? socket.receive({ op: 2, d: { negotiatedRpcVersion: 1 } })
        : socket.close(4009)))
      return
    }
    const { requestType, requestData } = d
    obs.requests.push({ requestType, requestData })
    if (requestType === 'GetSpecialInputs') {
      respond(d, { mic1 })
    } else if (requestType === 'SetInputMute') {
      obs.muted[requestData.inputName] = requestData.inputMuted
      respond(d)
    } else if (requestType === 'GetInputList') {
      respond(d, { inputs: Object.keys(sources).map((inputName) => ({ inputName, inputKind: 'browser_source' })) })
    } else if (requestType === 'GetInputSettings') {
      respond(d, { inputKind: 'browser_source', inputSettings: { ...sources[requestData.inputName] } })
    } else if (requestType === 'SetInputSettings') {
      Object.assign(sources[requestData.inputName], requestData.inputSettings)
      respond(d)
    }
  }
  socket.readyState = 1
  socket.onopen?.()
  socket.receive({
    op: 0,
    d: { obsWebSocketVersion: '5.6.3', rpcVersion: 1, authentication: { salt: SALT, challenge: CHALLENGE } }
  })
  return obs
}

const settle = async () => {
  for (let i = 0; i < 20; i++) await flushPromises()
}

// Вход плашка считает через WebCrypto, а он в Node крутится в общем пуле
// потоков: под нагрузкой ответ приходит не за фиксированное число оборотов
const connectObs = async (socket, options) => {
  const obs = startObs(socket, options)
  for (let i = 0; i < 1000 && !obs.identifyReceived; i++) await flushPromises()
  expect(obs.identifyReceived).toBe(true)
  await settle()
  return obs
}

const obsSockets = () => FakeSocket.instances.filter((socket) => socket.url === OBS_URL)
const lastObsSocket = () => obsSockets().at(-1)
const backendSocket = () => FakeSocket.instances.find((socket) => socket.url !== OBS_URL)

const mountDies = async (hash = SOUND_HASH) => {
  history.replaceState(null, '', PAGE_PATH + hash)
  const wrapper = mount(EventDiesView, {
    props: { id: EVENT_ID },
    global: { stubs: { GameOverlay: true, BetweenGamesOverlay: true } }
  })
  await settle()
  return wrapper
}

// Плашка с подключённым OBS
const mountWithObs = async (obsOptions) => {
  const wrapper = await mountDies()
  const obs = await connectObs(lastObsSocket(), obsOptions)
  return { wrapper, obs }
}

// Пуш состояния мероприятия с сервера: игра в эфире
const push = async (microphoneEnabled) => {
  backendSocket().receive({
    jsonrpc: '2.0',
    method: 'event_state',
    params: {
      event: { id: EVENT_ID, table_id: 1 },
      on_air: true,
      microphone_enabled: microphoneEnabled,
      current_game: { id: 'game-1' },
      previous_game: null
    }
  })
  await settle()
}

const audio = () => FakeAudio.instances[0]

const requestsOf = (obs, requestType) => obs.requests
  .filter((request) => request.requestType === requestType)
  .map((request) => request.requestData)

const storage = new Map()

enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.clearAllMocks()
  // setImmediate настоящий: на нём держится flushPromises
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  FakeSocket.instances = []
  FakeAudio.instances = []
  vi.stubGlobal('WebSocket', FakeSocket)
  vi.stubGlobal('Audio', FakeAudio)
  storage.clear()
  localStorage.getItem.mockImplementation((key) => storage.get(key) ?? null)
  localStorage.setItem.mockImplementation((key, value) => storage.set(key, String(value)))
  localStorage.removeItem.mockImplementation((key) => storage.delete(key))
  apiService.getRandomBroadcastTrack.mockResolvedValue({ url: TRACK_A })
  // Плашка подробно пишет в консоль, а ошибки OBS только туда и идут
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.getItem.mockReset()
  localStorage.setItem.mockReset()
  localStorage.removeItem.mockReset()
})

describe('EventDiesView: звук эфира', () => {
  it('ссылка без пароля OBS - плашка молчит: к OBS не подключается и музыку не просит', async () => {
    await mountDies('')
    await push(false)

    expect(obsSockets()).toEqual([])
    expect(FakeAudio.instances).toEqual([])
    expect(apiService.getRandomBroadcastTrack).not.toHaveBeenCalled()
  })

  it('микрофон выключен - Mic/Aux глушится сразу, музыка нарастает', async () => {
    const { obs } = await mountWithObs()

    await push(false)

    expect(lastObsSocket().protocol).toBe('obswebsocket.json')
    expect(obs.muted).toEqual({ 'Mic/Aux': true })
    expect(audio().src).toBe(TRACK_A)
    expect(audio().paused).toBe(false)
    expect(audio().volume).toBe(0)

    await vi.advanceTimersByTimeAsync(FADE_MS)

    expect(audio().volume).toBe(1)
  })

  it('микрофон включён - музыка затухает и встаёт на паузу, только потом включается Mic/Aux', async () => {
    const { obs } = await mountWithObs()
    await push(false)
    await vi.advanceTimersByTimeAsync(FADE_MS)

    await push(true)
    await vi.advanceTimersByTimeAsync(FADE_MS / 2)

    expect(audio().volume).toBeGreaterThan(0)
    expect(audio().volume).toBeLessThan(1)
    expect(obs.muted['Mic/Aux']).toBe(true)

    await vi.advanceTimersByTimeAsync(FADE_MS / 2)
    await settle()

    expect(audio().paused).toBe(true)
    expect(obs.muted['Mic/Aux']).toBe(false)

    // Ночь: тот же трек продолжается с места паузы, нового запроса нет
    await push(false)

    expect(obs.muted['Mic/Aux']).toBe(true)
    expect(audio().paused).toBe(false)
    expect(audio().src).toBe(TRACK_A)
    expect(apiService.getRandomBroadcastTrack).toHaveBeenCalledTimes(1)
  })

  it('флаг сменился посреди затухания - микрофон так и не включается', async () => {
    const { obs } = await mountWithObs()
    await push(false)
    await vi.advanceTimersByTimeAsync(FADE_MS)

    await push(true)
    await vi.advanceTimersByTimeAsync(FADE_MS / 3)
    await push(false)
    await vi.advanceTimersByTimeAsync(FADE_MS * 2)
    await settle()

    expect(requestsOf(obs, 'SetInputMute').map((request) => request.inputMuted)).not.toContain(false)
    expect(audio().paused).toBe(false)
    expect(audio().volume).toBe(1)
  })

  it('пуш без смены флага снова выставляет микрофон: ручное переключение в OBS не держится', async () => {
    const { obs } = await mountWithObs()
    await push(true)

    expect(obs.muted).toEqual({ 'Mic/Aux': false })

    // Ведущий заглушил микрофон руками, а потом судья поставил фол
    obs.muted['Mic/Aux'] = true
    await push(true)

    expect(obs.muted).toEqual({ 'Mic/Aux': false })
    expect(apiService.getRandomBroadcastTrack).not.toHaveBeenCalled()
  })

  it('после переподключения к OBS выставляет микрофон заново', async () => {
    await mountWithObs()
    await push(false)

    lastObsSocket().close(1006)
    await vi.advanceTimersByTimeAsync(OBS_RECONNECT_MS)
    const reconnected = await connectObs(lastObsSocket())

    expect(obsSockets()).toHaveLength(2)
    expect(reconnected.muted).toEqual({ 'Mic/Aux': true })
  })

  it('трек доиграл - следующий просит с exclude текущего и сразу играет', async () => {
    await mountWithObs()
    await push(false)
    apiService.getRandomBroadcastTrack.mockResolvedValueOnce({ url: TRACK_B })

    audio().finish()
    await settle()

    expect(apiService.getRandomBroadcastTrack).toHaveBeenLastCalledWith(TRACK_A)
    expect(audio().src).toBe(TRACK_B)
    expect(audio().paused).toBe(false)
  })

  it('музыки нет (404) - плашка молчит, а микрофон переключает как обычно и без затухания', async () => {
    apiService.getRandomBroadcastTrack.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 404'), { response: { status: 404 } })
    )
    const { wrapper, obs } = await mountWithObs()

    await push(false)

    expect(obs.muted).toEqual({ 'Mic/Aux': true })
    expect(audio().paused).toBe(true)

    await push(true)

    expect(obs.muted).toEqual({ 'Mic/Aux': false })
    expect(wrapper.find('.dies-error').exists()).toBe(false)
  })

  it('OBS недоступен - игра на плашке как обычно, переподключение каждые 5 с', async () => {
    const wrapper = await mountDies()
    lastObsSocket().close(1006)

    await push(false)

    expect(wrapper.find('.dies-error').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'GameOverlay' }).exists()).toBe(true)
    // Музыка от OBS не зависит: она уходит в эфир через источник плашки
    expect(audio().paused).toBe(false)

    await vi.advanceTimersByTimeAsync(OBS_RECONNECT_MS - 1)
    expect(obsSockets()).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(obsSockets()).toHaveLength(2)

    // Сервер WebSocket включили - звук снова переключается сам
    const obs = await connectObs(lastObsSocket())

    expect(obs.muted).toEqual({ 'Mic/Aux': true })
  })

  it('неверный пароль - OBS закрывает вход, микрофон не тронут, плашка пробует снова', async () => {
    await mountDies()
    const obs = await connectObs(lastObsSocket(), { password: 'другой пароль' })
    await push(false)

    expect(lastObsSocket().readyState).toBe(3)
    expect(obs.requests).toEqual([])

    await vi.advanceTimersByTimeAsync(OBS_RECONNECT_MS)

    expect(obsSockets()).toHaveLength(2)
  })

  it('#mic=, дописанный к ссылке, - глушит перечисленные источники вместо Mic/Aux', async () => {
    await mountDies(`${SOUND_HASH}#mic=${encodeURIComponent('Микрофон стола, Ведущий')}`)
    const obs = await connectObs(lastObsSocket())

    await push(false)

    expect(requestsOf(obs, 'GetSpecialInputs')).toEqual([])
    expect(obs.muted).toEqual({ 'Микрофон стола': true, 'Ведущий': true })
  })

  it('сервер без флага микрофона - звук не трогает', async () => {
    const { obs } = await mountWithObs()

    await push(undefined)

    expect(requestsOf(obs, 'SetInputMute')).toEqual([])
    expect(apiService.getRandomBroadcastTrack).not.toHaveBeenCalled()
  })

  it('ставит своему источнику «Control audio via OBS», а если галочка не встала - второй раз не трогает', async () => {
    const sources = {
      'Плашка': { url: `http://localhost:3000${PAGE_PATH}#obs=${PASSWORD}` },
      'Плашка стола 2': { url: `http://localhost:3000/event/${EVENT_ID}/dies?table=2#obs=x` },
      'Таймер': { url: 'https://example.com/timer' }
    }

    const { obs } = await mountWithObs({ sources })

    expect(requestsOf(obs, 'SetInputSettings')).toEqual([
      { inputName: 'Плашка', inputSettings: { reroute_audio: true } }
    ])

    // OBS пересоздал источник - страница загрузилась заново, а галочки нет
    sources['Плашка'].reroute_audio = false
    const { obs: reloaded } = await mountWithObs({ sources })

    expect(requestsOf(reloaded, 'SetInputSettings')).toEqual([])

    // Позже галочку сняли руками - следующая загрузка ставит её снова
    const { obs: later } = await mountWithObs({ sources })

    expect(requestsOf(later, 'SetInputSettings')).toEqual([
      { inputName: 'Плашка', inputSettings: { reroute_audio: true } }
    ])
  })
})
