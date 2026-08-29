// Круг игры создаётся её ходом, а не открытием страницы: тесты держат
// монтирование безобидным и номер дня равным номеру круга с сервера

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import GameInProgress from '@/components/game/GameInProgress.vue'
import VotingDialog from '@/components/game/dialogs/VotingDialog.vue'
import NightActionsDialog from '@/components/game/dialogs/NightActionsDialog.vue'
import { apiService } from '@/services/api.js'

vi.mock('@/services/api.js', () => ({
  apiService: {
    getGameState: vi.fn(),
    createGamePhase: vi.fn(),
    patchGamePhase: vi.fn()
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
  voted_box_ids: [],
  ppk_box_id: null,
  best_move: []
})

// Выставление живёт в таблице, а она застаблена: отдаём его через контракт диалога
const nominate = async (wrapper, boxIds) => {
  wrapper.findComponent(VotingDialog).vm.$emit('update:nominatedPlayers', boxIds)
  await flushPromises()
}

// Ночь закончена: диалог отдаёт круг и просит показать «Следующий круг»
const finishNight = async (wrapper, phase = emptyPhase()) => {
  const night = wrapper.findComponent(NightActionsDialog)
  night.vm.$emit('update:phaseData', phase)
  night.vm.$emit('next-round')
  await flushPromises()
}

let wrapper

beforeEach(() => {
  vi.clearAllMocks()
  apiService.createGamePhase.mockResolvedValue({})
  apiService.patchGamePhase.mockResolvedValue({})
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
  it('«Следующий круг» переводит первый день во второй, а не в третий', async () => {
    wrapper = await mountGame(gameState({ result: 'roles_assigned' }))
    expect(dayLabel(wrapper)).toBe('День 1')

    // Две проверки «не закончилась ли игра» отвечают первым кругом,
    // перечитывание после создания круга — вторым
    apiService.getGameState
      .mockResolvedValueOnce(gameState({ result: 'in_progress', phase_id: 1 }))
      .mockResolvedValueOnce(gameState({ result: 'in_progress', phase_id: 1 }))
      .mockResolvedValueOnce(gameState({ result: 'in_progress', phase_id: 2 }))
    await finishNight(wrapper, { ...emptyPhase(), killed_box_id: 5 })
    await wrapper.find('.header-right button').trigger('click')
    await flushPromises()

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

  it('игра, кончившаяся по итогам круга, тоже уходит заменой', async () => {
    wrapper = await mountGame(gameState({ result: 'in_progress', phase_id: 2 }))

    // Проверка после ночи отвечает идущей игрой, проверка перед новым кругом — концом
    apiService.getGameState
      .mockResolvedValueOnce(gameState({ result: 'in_progress', phase_id: 2 }))
      .mockResolvedValueOnce(gameState({ result: 'mafia_win', phase_id: 2 }))
    await finishNight(wrapper, { ...emptyPhase(), killed_box_id: 3 })
    await wrapper.find('.header-right button').trigger('click')
    await flushPromises()

    expect(router.replace).toHaveBeenCalledWith(`/game/${GAME_ID}/results`)
    expect(router.push).not.toHaveBeenCalled()
    // Кончившейся игре круг больше не нужен
    expect(apiService.createGamePhase).not.toHaveBeenCalled()
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
})
