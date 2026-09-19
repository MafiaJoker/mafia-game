// Круг игры создаётся её ходом, а не открытием страницы: тесты держат
// монтирование безобидным и номер дня равным номеру круга с сервера

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import GameInProgress from '@/components/game/GameInProgress.vue'
import GameTable from '@/components/game/GameTable.vue'
import FoulBadges from '@/components/game/FoulBadges.vue'
import VotingDialog from '@/components/game/dialogs/VotingDialog.vue'
import NightActionsDialog from '@/components/game/dialogs/NightActionsDialog.vue'
import BestMoveDialog from '@/components/game/dialogs/BestMoveDialog.vue'
import RemovePlayersDialog from '@/components/game/dialogs/RemovePlayersDialog.vue'
import { apiService } from '@/services/api.js'

vi.mock('@/services/api.js', () => ({
  apiService: {
    getGameState: vi.fn(),
    createGamePhase: vi.fn(),
    patchGamePhase: vi.fn(),
    addGamePhaseSilentBox: vi.fn(),
    deleteGamePhaseSilentBox: vi.fn(),
    finishGameBroadcast: vi.fn()
  }
}))

// Компонент уходит на страницу результатов, как только игра завершилась
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))

vi.mock('vue-router', () => ({
  useRouter: () => router
}))

const GAME_ID = 'game-1'

const players = () => Array.from({ length: 10 }, (_, index) => ({
  id: `user-${index + 1}`,
  nickname: `Игрок ${index + 1}`,
  box_id: index + 1,
  role: 'civilian',
  fouls: [{ type: 'regular', count: 0 }],
  is_in_game: true
}))

// Состояние игры с сервера: phase_id — номер последнего круга,
// при отсутствии фаз сервер отдаёт 1 и статус roles_assigned
const gameState = (overrides = {}) => ({
  phase_id: 1,
  result: 'roles_assigned',
  players: players(),
  rule_system: { removal_thresholds: [{ foul_type: 'regular', removal_threshold: 4 }] },
  ...overrides
})

// el-table в happy-dom падает на MutationObserver, а таблица здесь не проверяется
const mountGame = async (state = gameState()) => {
  apiService.getGameState.mockResolvedValue(state)
  const wrapper = mount(GameInProgress, {
    props: { gameId: GAME_ID },
    global: { stubs: { GameTable: true } }
  })
  await flushPromises()
  return wrapper
}

const dayLabel = (wrapper) => wrapper.find('.phase-indicator').text()

const headerButton = (wrapper) => wrapper.find('.header-right button').text()

// Пустой круг в том виде, в каком его держит компонент
const emptyPhase = () => ({
  don_checked_box_id: null,
  sheriff_checked_box_id: null,
  killed_box_id: null,
  removed_box_ids: [],
  night_removed_box_ids: [],
  voted_box_ids: [],
  ppk_box_id: null,
  best_move: []
})

// Выставление живёт в таблице, а она застаблена: отдаём его через контракт диалога
const nominate = async (wrapper, boxIds) => {
  wrapper.findComponent(VotingDialog).vm.$emit('update:nominatedPlayers', boxIds)
  await flushPromises()
}

// Ночь закончена: диалог отдаёт круг, и новый день начинается сразу
const finishNight = async (wrapper, phase = emptyPhase()) => {
  const night = wrapper.findComponent(NightActionsDialog)
  night.vm.$emit('update:phaseData', phase)
  night.vm.$emit('next-round')
  await flushPromises()
}

let wrapper

beforeEach(() => {
  vi.clearAllMocks()
  // Ручки круга отвечают состоянием игры: по умолчанию - идущей
  apiService.createGamePhase.mockResolvedValue(gameState({ result: 'in_progress' }))
  apiService.patchGamePhase.mockResolvedValue(gameState({ result: 'in_progress' }))
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('GameInProgress: создание круга при открытии страницы', () => {
  it('создаёт первый круг на старте игры: фаз ещё нет', async () => {
    wrapper = await mountGame(gameState({ result: 'roles_assigned' }))

    expect(apiService.createGamePhase).toHaveBeenCalledTimes(1)
    expect(apiService.createGamePhase).toHaveBeenCalledWith(GAME_ID, {})
    expect(dayLabel(wrapper)).toBe('День 1')
  })

  it('не трогает игру, у которой круг уже идёт', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 3 }))

    expect(apiService.createGamePhase).not.toHaveBeenCalled()
    expect(dayLabel(wrapper)).toBe('День 3')
  })

  it('перезагрузка посреди первого дня оставляет судью в первом дне', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 1 }))

    expect(apiService.createGamePhase).not.toHaveBeenCalled()
    expect(dayLabel(wrapper)).toBe('День 1')
  })

  it('три открытия подряд не добавляют игре ни одного круга', async () => {
    const state = gameState({ result: 'in_progress', phase_id: 2 })
    for (let i = 0; i < 3; i += 1) {
      const opened = await mountGame(state)
      expect(dayLabel(opened)).toBe('День 2')
      opened.unmount()
    }

    expect(apiService.createGamePhase).not.toHaveBeenCalled()
  })
})

describe('GameInProgress: номер дня и правила первого дня', () => {
  it('ночь переводит первый день во второй, а не в третий', async () => {
    wrapper = await mountGame(gameState({ result: 'roles_assigned' }))
    expect(dayLabel(wrapper)).toBe('День 1')

    // Итог ночи приходит ответом PATCH круга, новый круг — ответом POST
    apiService.patchGamePhase.mockResolvedValue(gameState({ result: 'in_progress', phase_id: 1 }))
    apiService.createGamePhase.mockResolvedValue(gameState({ result: 'in_progress', phase_id: 2 }))
    await finishNight(wrapper, { ...emptyPhase(), killed_box_id: 5 })

    expect(apiService.createGamePhase).toHaveBeenCalledTimes(2)
    expect(dayLabel(wrapper)).toBe('День 2')
  })

  it('в первый день единственный выставленный не голосуется даже после перезагрузки', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 1 }))

    await nominate(wrapper, [4])

    expect(headerButton(wrapper)).toBe('Ночь')
  })

  it('со второго дня единственный выставленный уходит без голосования', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    await nominate(wrapper, [4])
    expect(headerButton(wrapper)).toBe('Начать голосование')

    await wrapper.find('.header-right button').trigger('click')
    await flushPromises()

    // Диалог не понадобился: игрок выбыл сразу, дальше только ночь
    expect(wrapper.findComponent(VotingDialog).props('modelValue')).toBe(false)
    expect(headerButton(wrapper)).toBe('Ночь')
  })
})

describe('GameInProgress: уход завершённой игры на результаты', () => {
  it('открытая завершённая игра не оставляет себя в истории браузера', async () => {
    wrapper = await mountGame(gameState({ result: 'civilians_win' }))

    // push оставил бы позади ведение игры, а оно снова уводит на результаты
    expect(router.replace).toHaveBeenCalledWith(`/game/${GAME_ID}/results`)
    expect(router.push).not.toHaveBeenCalled()
    expect(apiService.createGamePhase).not.toHaveBeenCalled()
  })

  it('игра, кончившаяся ночью, сразу уходит на результаты заменой', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    // Сохранённая ночь закончила игру: об этом говорит ответ PATCH круга
    apiService.patchGamePhase.mockResolvedValue(gameState({ result: 'mafia_win', phase_id: 2 }))
    await finishNight(wrapper, { ...emptyPhase(), killed_box_id: 3 })

    expect(router.replace).toHaveBeenCalledWith(`/game/${GAME_ID}/results`)
    expect(router.push).not.toHaveBeenCalled()
    // Кончившейся игре круг больше не нужен
    expect(apiService.createGamePhase).not.toHaveBeenCalled()
  })
})

// Заголосованный выбывает сразу, поэтому игра может кончиться голосованием,
// а не ночью: угадайка, равенство команд (#93). Итог приходит ответом PATCH круга
describe('GameInProgress: конец игры голосованием', () => {
  // Голосование закончено: диалог отдаёт круг с заголосованными
  const finishVoting = async (wrapper, votedBoxIds) => {
    const voting = wrapper.findComponent(VotingDialog)
    voting.vm.$emit('update:phaseData', { ...emptyPhase(), voted_box_ids: votedBoxIds })
    voting.vm.$emit('voting-completed')
    await flushPromises()
  }

  it('угадайка: после заголосованного красного вместо «Ночи» «Завершить игру»', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 5 }))
    await nominate(wrapper, [2, 3])

    apiService.patchGamePhase.mockResolvedValue(gameState({ result: 'mafia_win', phase_id: 5 }))
    await finishVoting(wrapper, [2])

    expect(apiService.patchGamePhase).toHaveBeenCalledWith(GAME_ID, { voted_box_ids: [2] })
    expect(headerButton(wrapper)).toBe('Завершить игру')
  })

  it('«Завершить игру» уводит на результаты, не отправляя круг снова', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 5 }))
    await nominate(wrapper, [1, 2])

    apiService.patchGamePhase.mockResolvedValue(gameState({ result: 'civilians_win', phase_id: 5 }))
    await finishVoting(wrapper, [1])
    await wrapper.find('.header-right button').trigger('click')
    await flushPromises()

    expect(apiService.patchGamePhase).toHaveBeenCalledTimes(1)
    expect(apiService.createGamePhase).not.toHaveBeenCalled()
    // Игру уводит из эфира эта кнопка, а не финальный статус: до неё в зале
    // идёт уходящая минута, и экран трансляции остаётся игровым
    expect(apiService.finishGameBroadcast).toHaveBeenCalledWith(GAME_ID)
    expect(router.replace).toHaveBeenCalledWith(`/game/${GAME_ID}/results`)
  })

  it('уводит в протокол, даже если эфир не выключился', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 5 }))
    await nominate(wrapper, [1, 2])

    apiService.patchGamePhase.mockResolvedValue(gameState({ result: 'civilians_win', phase_id: 5 }))
    apiService.finishGameBroadcast.mockRejectedValueOnce(new Error('network'))
    await finishVoting(wrapper, [1])
    await wrapper.find('.header-right button').trigger('click')
    await flushPromises()

    expect(router.replace).toHaveBeenCalledWith(`/game/${GAME_ID}/results`)
  })

  it('со второго дня единственный выставленный тоже может закончить игру', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 3 }))
    await nominate(wrapper, [4])

    apiService.patchGamePhase.mockResolvedValue(gameState({ result: 'mafia_win', phase_id: 3 }))
    await wrapper.find('.header-right button').trigger('click')
    await flushPromises()

    expect(apiService.patchGamePhase).toHaveBeenCalledWith(GAME_ID, { voted_box_ids: [4] })
    expect(headerButton(wrapper)).toBe('Завершить игру')
  })

  it('игра после голосования идёт: «Ночь», а ночь дописывает круг', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 3 }))
    await nominate(wrapper, [1, 5])

    await finishVoting(wrapper, [1])
    expect(headerButton(wrapper)).toBe('Ночь')

    apiService.createGamePhase.mockResolvedValue(gameState({ result: 'in_progress', phase_id: 4 }))
    await finishNight(wrapper, { ...emptyPhase(), voted_box_ids: [1], killed_box_id: 6 })

    expect(apiService.patchGamePhase).toHaveBeenCalledTimes(2)
    expect(apiService.patchGamePhase).toHaveBeenLastCalledWith(GAME_ID, { voted_box_ids: [1], killed_box_id: 6 })
    expect(dayLabel(wrapper)).toBe('День 4')
  })

  it('голосование без выбывших круг не сохраняет', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 3 }))
    await nominate(wrapper, [4, 5])

    // Подъём всех кандидатур не набрал голосов: никто не выбыл
    await finishVoting(wrapper, [])

    expect(apiService.patchGamePhase).not.toHaveBeenCalled()
    expect(headerButton(wrapper)).toBe('Ночь')
  })

  it('пока голосование сохраняется, «Ночь» в загрузке и не нажимается', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 3 }))
    await nominate(wrapper, [4, 5])

    let answerPatch
    apiService.patchGamePhase.mockReturnValueOnce(new Promise(resolve => { answerPatch = resolve }))
    await finishVoting(wrapper, [4])

    expect(wrapper.find('.header-right button').classes()).toContain('is-loading')

    answerPatch(gameState({ result: 'mafia_win', phase_id: 3 }))
    await flushPromises()

    expect(headerButton(wrapper)).toBe('Завершить игру')
    expect(wrapper.find('.header-right button').classes()).not.toContain('is-loading')
  })

  it('упавшее сохранение голосования не теряет его: круг уходит снова с ночью', async () => {
    const toast = vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 3 }))
    await nominate(wrapper, [4, 5])

    apiService.patchGamePhase.mockRejectedValueOnce(new Error('Network Error'))
    await finishVoting(wrapper, [4])

    expect(toast).toHaveBeenCalledWith('Не удалось сохранить голосование')
    expect(headerButton(wrapper)).toBe('Ночь')

    // Итог игры проверяется уже с ночью
    apiService.patchGamePhase.mockResolvedValue(gameState({ result: 'mafia_win', phase_id: 3 }))
    await finishNight(wrapper, { ...emptyPhase(), voted_box_ids: [4] })

    expect(apiService.patchGamePhase).toHaveBeenCalledTimes(2)
    expect(apiService.patchGamePhase).toHaveBeenLastCalledWith(GAME_ID, { voted_box_ids: [4] })
    expect(router.replace).toHaveBeenCalledWith(`/game/${GAME_ID}/results`)
    toast.mockRestore()
  })
})

describe('GameInProgress: сохранение круга', () => {
  it('шлёт только заполненные поля: перезагрузка не обнуляет сохранённый круг', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    await finishNight(wrapper, { ...emptyPhase(), killed_box_id: 7 })

    expect(apiService.patchGamePhase).toHaveBeenCalledWith(GAME_ID, { killed_box_id: 7 })
  })

  it('не шлёт PATCH за круг, в котором ничего не произошло', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    await finishNight(wrapper)

    expect(apiService.patchGamePhase).not.toHaveBeenCalled()
  })

  // Удаление ночью едет своим полем: бек по половине круга считает автоничью
  it('шлёт ночное удаление отдельно от дневного', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    await finishNight(wrapper, { ...emptyPhase(), night_removed_box_ids: [4] })

    expect(apiService.patchGamePhase).toHaveBeenCalledWith(GAME_ID, {
      night_removed_box_ids: [4]
    })
  })

  // Сервер мог записать круг и потерять ответ: после ошибки круг не считается
  // сохранённым, иначе откат правки к прошлому телу не дошёл бы до сервера
  it('после ошибки PATCH откат правки к сохранённому кругу снова уходит на сервер', async () => {
    const toast = vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))
    const night = { ...emptyPhase(), killed_box_id: 5 }

    // Круг сохранился, а новый не создался: судья переигрывает ночь
    apiService.createGamePhase.mockRejectedValueOnce(new Error('Network Error'))
    await finishNight(wrapper, night)
    expect(toast).toHaveBeenCalledWith('Не удалось сохранить фазу игры')

    // Правка отстрела, ответ на которую потерялся
    apiService.patchGamePhase.mockRejectedValueOnce(new Error('timeout of 10000ms exceeded'))
    await finishNight(wrapper, { ...night, killed_box_id: 6 })
    expect(apiService.createGamePhase).toHaveBeenCalledTimes(1)

    // Откат к сохранённому телу: сервер мог записать правку, поэтому шлём снова
    await finishNight(wrapper, night)

    expect(apiService.patchGamePhase).toHaveBeenCalledTimes(3)
    expect(apiService.patchGamePhase).toHaveBeenLastCalledWith(GAME_ID, { killed_box_id: 5 })
    expect(apiService.createGamePhase).toHaveBeenCalledTimes(2)
    toast.mockRestore()
  })

  it('после ошибки PATCH сверяет экран с состоянием игры', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    // Ночь закончила игру на сервере, но ответ PATCH потерялся
    apiService.patchGamePhase.mockRejectedValueOnce(new Error('Network Error'))
    apiService.getGameState.mockResolvedValue(gameState({ result: 'mafia_win', phase_id: 2 }))
    await finishNight(wrapper, { ...emptyPhase(), killed_box_id: 3 })

    expect(apiService.getGameState).toHaveBeenCalledTimes(2)
    expect(headerButton(wrapper)).toBe('Завершить игру')
  })
})

// Отметку о выбытии на настольном экране рисует таблица, а она застаблена:
// проверяем на списке телефона, где та же разметка живёт своей вёрсткой
describe('GameInProgress: удалённый ночью в списке игроков', () => {
  const DESKTOP_WIDTH = window.innerWidth

  beforeEach(() => {
    window.innerWidth = 375
  })

  afterEach(() => {
    window.innerWidth = DESKTOP_WIDTH
  })

  const nominationCell = (wrapper, boxId) => wrapper
    .findAll('.player-row')[boxId - 1]
    .find('.col-nomination')
    .text()

  it('пока новый круг не создан, отмечает удалённого ночью так же, как удалённого днём', async () => {
    const toast = vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    // Ночь сохранилась, а новый круг не создался: судья остаётся в этом круге
    apiService.createGamePhase.mockRejectedValueOnce(new Error('Network Error'))
    await finishNight(wrapper, { ...emptyPhase(), night_removed_box_ids: [4] })

    expect(nominationCell(wrapper, 4)).toBe('выбыл')
    expect(nominationCell(wrapper, 5)).toBe('-')
    toast.mockRestore()
  })
})

// Кто начинает круг и кто в нём молчит, считает сервер (MafiaJoker/backend#166):
// компонент это показывает и переносит молчание между этим и следующим кругом.
// Метки проверяем на списке телефона - таблица застаблена
describe('GameInProgress: кто начинает круг и кто в нём молчит', () => {
  const DESKTOP_WIDTH = window.innerWidth

  beforeEach(() => {
    window.innerWidth = 375
  })

  afterEach(() => {
    window.innerWidth = DESKTOP_WIDTH
  })

  const rowOf = (wrapper, boxId) => wrapper.findAll('.player-row')[boxId - 1]
  const marksOf = (wrapper, boxId) => rowOf(wrapper, boxId).find('.round-speech-marks')
  const silenceSwitch = (wrapper, boxId) => rowOf(wrapper, boxId).find('button.speech-mark')

  // Состояние игры, в котором поменялся один игрок
  const withPlayer = (state, boxId, changes) => ({
    ...state,
    players: state.players.map(player => (
      player.box_id === boxId ? { ...player, ...changes } : player
    ))
  })

  // Фолы игроку: бейдж отдаёт ответ ручки фолов - состояние игры
  const saveFouls = async (wrapper, boxId, state) => {
    wrapper.findAllComponents(FoulBadges)
      .find(badges => badges.props('player').box_id === boxId)
      .vm.$emit('saved', state)
    await flushPromises()
  }

  it('подсвечивает того, кто начинает круг', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2, phase_start_box_id: 3 }))

    expect(wrapper.findAll('.phase-start-player')).toHaveLength(1)
    expect(rowOf(wrapper, 3).classes()).toContain('phase-start-player')
    expect(marksOf(wrapper, 3).text()).toBe('Начинает круг')
    expect(marksOf(wrapper, 4).exists()).toBe(false)
  })

  it('перенесённое с прошлого круга молчание показывает без переключателя', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 3, silent_box_ids: [5] }))

    expect(marksOf(wrapper, 5).text()).toBe('Молчит в этом круге')
    // Его снимают правкой фола: ручка молчания ответила бы 400
    expect(silenceSwitch(wrapper, 5).exists()).toBe(false)
  })

  it('третий фол: молчит в следующем круге, а переключатель отнимает минуту уже в этом', async () => {
    const state = gameState({ result: 'in_progress', phase_id: 2 })
    wrapper = await mountGame(state)

    const fouled = {
      ...withPlayer(state, 7, { fouls: [{ type: 'regular', count: 3 }] }),
      next_phase_silent_box_ids: [7]
    }
    await saveFouls(wrapper, 7, fouled)
    expect(marksOf(wrapper, 7).text()).toBe('Молчит в следующем круге')

    apiService.addGamePhaseSilentBox.mockResolvedValue({
      ...fouled,
      silent_box_ids: [7],
      next_phase_silent_box_ids: []
    })
    await silenceSwitch(wrapper, 7).trigger('click')
    await flushPromises()

    expect(apiService.addGamePhaseSilentBox).toHaveBeenCalledWith(GAME_ID, 2, 7)
    expect(marksOf(wrapper, 7).text()).toBe('Молчит в этом круге')

    // Нажал по ошибке - тот же переключатель возвращает минуту
    apiService.deleteGamePhaseSilentBox.mockResolvedValue(fouled)
    await silenceSwitch(wrapper, 7).trigger('click')
    await flushPromises()

    expect(apiService.deleteGamePhaseSilentBox).toHaveBeenCalledWith(GAME_ID, 2, 7)
    expect(apiService.addGamePhaseSilentBox).toHaveBeenCalledTimes(1)
    expect(marksOf(wrapper, 7).text()).toBe('Молчит в следующем круге')
  })

  it('выбывшему по фолам круг молчания больше не выбирают', async () => {
    const state = gameState({ result: 'in_progress', phase_id: 2, next_phase_silent_box_ids: [7] })
    wrapper = await mountGame(state)
    expect(silenceSwitch(wrapper, 7).exists()).toBe(true)

    // Минуту отняли, а следом игрок получил четвёртый фол и выбыл
    await saveFouls(wrapper, 7, {
      ...withPlayer(state, 7, { fouls: [{ type: 'regular', count: 4 }], is_in_game: false }),
      silent_box_ids: [7],
      next_phase_silent_box_ids: []
    })

    expect(marksOf(wrapper, 7).text()).toBe('Молчит в этом круге')
    expect(silenceSwitch(wrapper, 7).exists()).toBe(false)
  })

  // Голосование и удаления живут в круге до его сохранения: сервер о выбывших
  // ещё не знает, и is_in_game у них прежний
  it('заголосованному и удалённому в этом круге круг молчания больше не выбирают', async () => {
    const state = gameState({ result: 'in_progress', phase_id: 2, next_phase_silent_box_ids: [7, 8] })
    wrapper = await mountGame(state)
    expect(silenceSwitch(wrapper, 7).exists()).toBe(true)
    expect(silenceSwitch(wrapper, 8).exists()).toBe(true)

    wrapper.findComponent(VotingDialog).vm.$emit('update:phaseData', { ...emptyPhase(), voted_box_ids: [7] })
    await flushPromises()

    expect(marksOf(wrapper, 7).text()).toBe('Молчит в следующем круге')
    expect(silenceSwitch(wrapper, 7).exists()).toBe(false)
    expect(silenceSwitch(wrapper, 8).exists()).toBe(true)

    wrapper.findComponent(RemovePlayersDialog).vm.$emit('update:phaseData', {
      ...emptyPhase(),
      voted_box_ids: [7],
      removed_box_ids: [8]
    })
    await flushPromises()

    expect(silenceSwitch(wrapper, 8).exists()).toBe(false)
  })

  it('в новом круге перенесённое молчание уже не переключается', async () => {
    const state = gameState({ result: 'in_progress', phase_id: 2, next_phase_silent_box_ids: [7] })
    wrapper = await mountGame(state)
    expect(silenceSwitch(wrapper, 7).exists()).toBe(true)

    // Минуту в круге 2 не отняли - сервер перенёс молчание в круг 3,
    // новый круг приходит ответом POST
    apiService.createGamePhase.mockResolvedValue(gameState({
      result: 'in_progress',
      phase_id: 3,
      phase_start_box_id: 2,
      silent_box_ids: [7]
    }))
    await finishNight(wrapper, { ...emptyPhase(), killed_box_id: 5 })

    expect(marksOf(wrapper, 2).text()).toBe('Начинает круг')
    expect(marksOf(wrapper, 7).text()).toBe('Молчит в этом круге')
    expect(silenceSwitch(wrapper, 7).exists()).toBe(false)
  })
})

describe('GameInProgress: начинающий круг в таблице', () => {
  it('строка начинающего круг получает свой класс рядом с классом выбывшего', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2, phase_start_box_id: 3 }))

    const rowClassName = wrapper.findComponent(GameTable).props('rowClassName')
    expect(rowClassName({ row: { box_id: 3, is_in_game: true } })).toBe('phase-start-player')
    expect(rowClassName({ row: { box_id: 4, is_in_game: true } })).toBe('')
    expect(rowClassName({ row: { box_id: 3, is_in_game: false } })).toBe('inactive-player phase-start-player')
  })
})

// Ручки круга отвечают состоянием игры (MafiaJoker/backend#166): GET /state
// нужен только чтобы восстановить игру с нуля - при открытии страницы
describe('GameInProgress: запросы круга', () => {
  it('ночь не перечитывает состояние: новый круг приходит ответом POST', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    // Отстреленный ночью в новом круге уже не играет, начинает круг четвёртый
    apiService.createGamePhase.mockResolvedValue(gameState({
      result: 'in_progress',
      phase_id: 3,
      phase_start_box_id: 4,
      players: players().map(player => ({ ...player, is_in_game: player.box_id !== 5 }))
    }))
    await finishNight(wrapper, { ...emptyPhase(), killed_box_id: 5 })

    expect(apiService.getGameState).toHaveBeenCalledTimes(1)
    expect(dayLabel(wrapper)).toBe('День 3')
    // Отдельной кнопки «Следующий круг» больше нет: в новом дне в шапке снова «Ночь»
    expect(headerButton(wrapper)).toBe('Ночь')
    const table = wrapper.findComponent(GameTable)
    expect(table.props('data').find(player => player.box_id === 5).is_in_game).toBe(false)
    expect(table.props('rowClassName')({ row: { box_id: 4, is_in_game: true } })).toBe('phase-start-player')
  })

  it('повтор перехода после упавшего POST не шлёт тот же круг второй раз', async () => {
    const toast = vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    apiService.createGamePhase.mockRejectedValueOnce(new Error('Network Error'))
    await finishNight(wrapper, { ...emptyPhase(), killed_box_id: 5 })
    expect(dayLabel(wrapper)).toBe('День 2')

    // Судья снова открывает ночь и жмёт «Продолжить» с тем же кругом
    await finishNight(wrapper, { ...emptyPhase(), killed_box_id: 5 })

    expect(apiService.patchGamePhase).toHaveBeenCalledTimes(1)
    expect(apiService.createGamePhase).toHaveBeenCalledTimes(2)
    toast.mockRestore()
  })

  // Бек повторный POST не отсекает: второй переход поверх идущего создал бы
  // лишний круг, и игра перескочила бы день
  it('второй переход, пока идёт первый, не создаёт ещё один круг', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    let answerPatch
    apiService.patchGamePhase.mockReturnValueOnce(new Promise(resolve => { answerPatch = resolve }))
    const night = wrapper.findComponent(NightActionsDialog)
    night.vm.$emit('update:phaseData', { ...emptyPhase(), killed_box_id: 5 })
    night.vm.$emit('next-round')
    night.vm.$emit('next-round')
    await flushPromises()

    // Пока сервер не ответил, кнопка фазы в загрузке и не нажимается
    expect(wrapper.find('.header-right button').classes()).toContain('is-loading')

    answerPatch(gameState({ result: 'in_progress', phase_id: 2 }))
    await flushPromises()

    expect(apiService.patchGamePhase).toHaveBeenCalledTimes(1)
    expect(apiService.createGamePhase).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.header-right button').classes()).not.toContain('is-loading')
  })

  it('ответ ручки круга без состояния перечитывает игру с нуля', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    // Бекенд до MafiaJoker/backend#166 отвечал на POST пустым телом
    apiService.createGamePhase.mockResolvedValue('')
    apiService.getGameState.mockResolvedValue(gameState({ result: 'in_progress', phase_id: 3 }))
    await finishNight(wrapper, { ...emptyPhase(), killed_box_id: 5 })

    expect(apiService.getGameState).toHaveBeenCalledTimes(2)
    expect(dayLabel(wrapper)).toBe('День 3')
  })
})

// Утром ведущему напоминают, кого убили ночью. Тост показывает уже новый день,
// а галочка для него живёт в ночном диалоге
describe('GameInProgress: тост об убитом ночью', () => {
  const KILLED_TOAST_STORAGE_KEY = 'game_show_killed_toast'

  const toastTexts = () => Array.from(document.querySelectorAll('.el-message'))
    .map(message => message.textContent.trim())

  beforeEach(() => {
    document.querySelectorAll('.el-message').forEach(message => message.remove())
  })

  afterEach(() => {
    localStorage.getItem.mockReset()
  })

  it('в новом дне называет убитого номером и ником', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    await finishNight(wrapper, { ...emptyPhase(), killed_box_id: 5 })

    expect(toastTexts()).toContain('Ночью убит игрок 5 — Игрок 5')
  })

  it('после ЛХ новый день тоже начинается сразу и с тостом', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 1 }))
    apiService.createGamePhase.mockResolvedValue(gameState({ result: 'in_progress', phase_id: 2 }))

    const bestMove = wrapper.findComponent(BestMoveDialog)
    bestMove.vm.$emit('update:phaseData', { ...emptyPhase(), killed_box_id: 5, best_move: [1, 2, 3] })
    bestMove.vm.$emit('accept')
    await flushPromises()

    expect(apiService.patchGamePhase).toHaveBeenCalledWith(GAME_ID, { killed_box_id: 5, best_move: [1, 2, 3] })
    expect(dayLabel(wrapper)).toBe('День 2')
    expect(toastTexts()).toContain('Ночью убит игрок 5 — Игрок 5')
  })

  it('после промаха молчит', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    await finishNight(wrapper)

    expect(apiService.createGamePhase).toHaveBeenCalledTimes(1)
    expect(toastTexts()).toEqual([])
  })

  it('молчит, когда ведущий снял галочку, и запоминает выбор на устройстве', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    wrapper.findComponent(NightActionsDialog).vm.$emit('update:showKilledToast', false)
    await finishNight(wrapper, { ...emptyPhase(), killed_box_id: 5 })

    expect(toastTexts()).toEqual([])
    expect(localStorage.setItem).toHaveBeenCalledWith(KILLED_TOAST_STORAGE_KEY, 'false')
  })

  it('снятая галочка переживает перезагрузку страницы', async () => {
    localStorage.getItem.mockImplementation(key => (key === KILLED_TOAST_STORAGE_KEY ? 'false' : null))
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    expect(wrapper.findComponent(NightActionsDialog).props('showKilledToast')).toBe(false)
  })
})
