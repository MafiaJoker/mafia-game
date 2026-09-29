// Протокол игры: кто первый убитый (ПУ), кого он назвал в лучшем ходе и
// сколько баллов за ЛХ - всё это присылает сервер. Страница отмечает ПУ,
// красит названные боксы по ролям и баллы не пересчитывает

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { ElTable, ElInputNumber } from 'element-plus'
import GameResultsView from '@/views/GameResultsView.vue'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    getGame: vi.fn(),
    setPlayersPoints: vi.fn()
  },
  initApiUrl: vi.fn()
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: vi.fn() })
}))

vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

const DESKTOP_WIDTH = 1280
const TABLET_WIDTH = 900
const MOBILE_WIDTH = 375

const setViewport = (width) => {
  window.innerWidth = width
}

// Чёрные - 3 дон, 5 и 8 мафия, шериф - 7
const ROLES = ['civilian', 'civilian', 'don', 'civilian', 'mafia',
  'civilian', 'sheriff', 'mafia', 'civilian', 'civilian']

const TWO_HITS = { box_id: 4, is_black: false, best_move_box_ids: [3, 5, 9], best_move_hits: 2 }

const gameDetail = ({ firstKilled = TWO_HITS, bestMovePoints = 0.5 } = {}) => ({
  label: 'Игра 1',
  event: { id: 'event-1', label: 'Турнир', rule_system: { slug: 'fiim', label: 'ФИИМ' }, stages: null },
  started_at: '2026-09-29T16:00:00Z',
  table_name: 'Стол 1',
  result: 'civilians_win',
  game_master: { id: 'gm-1', nickname: 'Судья' },
  players: ROLES.map((role, index) => ({
    id: `user-${index + 1}`,
    nickname: `Игрок ${index + 1}`,
    box_id: index + 1,
    role,
    auto_points: 1.3,
    extra_points: null,
    penalty_points: null,
    best_move_points: firstKilled && firstKilled.box_id === index + 1 ? bestMovePoints : 0,
    comment: null
  })),
  first_killed: firstKilled,
  stage_id: null
})

const mountResults = async (game = gameDetail()) => {
  apiService.getGame.mockResolvedValue(game)
  const wrapper = mount(GameResultsView, { props: { id: 'game-1' } })
  await flushPromises()
  return wrapper
}

const headers = (wrapper) => wrapper.findAll('.el-table__header th').map((th) => th.text())

const bodyRows = (wrapper) => wrapper.findAll('.el-table__body tr')

// Названные в ЛХ боксы: номер и цвет команды
const boxesOf = (node) => node.findAll('.best-move-box').map((box) => [
  box.text(),
  box.classes('is-black') ? 'чёрный' : 'красный'
])

// Обёртки прошлых тестов не должны жить дальше: ширина экрана у всех общая
enableAutoUnmount(afterEach)

describe('GameResultsView: ПУ и лучший ход', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setViewport(DESKTOP_WIDTH)
  })

  afterEach(() => {
    setViewport(DESKTOP_WIDTH)
  })

  it('отмечает ПУ и показывает его ЛХ: баллы и названные боксы в цвете команды', async () => {
    const wrapper = await mountResults()

    expect(headers(wrapper)).toContain('ЛХ')
    const rows = bodyRows(wrapper)
    expect(rows).toHaveLength(10)
    const marked = rows.filter((row) => row.findAll('.el-tag').some((tag) => tag.text() === 'ПУ'))
    expect(marked).toHaveLength(1)
    expect(marked[0].text()).toContain('Игрок 4')

    const cell = rows[3].find('.best-move-cell')
    expect(cell.find('.positive-score').text()).toBe('+0.5')
    expect(boxesOf(cell)).toEqual([['3', 'чёрный'], ['5', 'чёрный'], ['9', 'красный']])
    // у остальных девяти в колонке прочерк
    expect(wrapper.findAll('.best-move-cell')).toHaveLength(1)
    expect(wrapper.findAll('.no-best-move')).toHaveLength(9)
  })

  it('цвет бокса - по роли: шериф красный, дон и мафия чёрные; порядок как у сервера', async () => {
    const wrapper = await mountResults(gameDetail({
      firstKilled: { box_id: 4, is_black: false, best_move_box_ids: [7, 3, 8], best_move_hits: 2 }
    }))

    expect(boxesOf(wrapper.find('.best-move-cell')))
      .toEqual([['7', 'красный'], ['3', 'чёрный'], ['8', 'чёрный']])
  })

  it('ПУ без ЛХ - ноль и «не заявлен», а не пустая ячейка', async () => {
    const wrapper = await mountResults(gameDetail({
      firstKilled: { box_id: 4, is_black: false, best_move_box_ids: null, best_move_hits: null },
      bestMovePoints: 0
    }))

    const cell = wrapper.find('.best-move-cell')
    expect(cell.text()).toContain('0')
    expect(cell.text()).toContain('не заявлен')
    expect(cell.text()).not.toContain('+0')
    expect(cell.find('.best-move-box').exists()).toBe(false)
  })

  it('чёрному ПУ ЛХ не положен, но кого он назвал - видно', async () => {
    const wrapper = await mountResults(gameDetail({
      firstKilled: { box_id: 5, is_black: true, best_move_box_ids: [2, 3, 8], best_move_hits: 2 },
      bestMovePoints: 0
    }))

    expect(bodyRows(wrapper)[4].text()).toContain('ПУ')
    const cell = wrapper.find('.best-move-cell')
    expect(cell.text()).toContain('не положен')
    expect(boxesOf(cell)).toEqual([['2', 'красный'], ['3', 'чёрный'], ['8', 'чёрный']])
  })

  it('баллы за ЛХ берёт у сервера, а не выводит из попаданий', async () => {
    // ФИИМ классика: допы 0.6 выше ЛХ 0.5 и поглотили его
    const wrapper = await mountResults(gameDetail({ bestMovePoints: 0 }))

    const cell = wrapper.find('.best-move-cell')
    expect(cell.find('.positive-score').exists()).toBe(false)
    expect(cell.text()).not.toContain('не заявлен')
    expect(boxesOf(cell)).toEqual([['3', 'чёрный'], ['5', 'чёрный'], ['9', 'красный']])
  })

  it('первой ночью промах: колонка на месте, у всех прочерк, отметки нет', async () => {
    const wrapper = await mountResults(gameDetail({ firstKilled: null }))

    expect(headers(wrapper)).toContain('ЛХ')
    expect(wrapper.findAll('.no-best-move')).toHaveLength(10)
    expect(wrapper.findAll('.el-tag').some((tag) => tag.text() === 'ПУ')).toBe(false)
  })

  it('сервер без first_killed - ни колонки ЛХ, ни отметки', async () => {
    const game = gameDetail()
    delete game.first_killed
    const wrapper = await mountResults(game)

    expect(headers(wrapper)).not.toContain('ЛХ')
    expect(wrapper.find('.best-move-cell').exists()).toBe(false)
    expect(wrapper.find('.no-best-move').exists()).toBe(false)
    expect(wrapper.findAll('.el-tag').some((tag) => tag.text() === 'ПУ')).toBe(false)
  })

  it('на планшете ЛХ стоит под ником ПУ вместо отдельной колонки', async () => {
    setViewport(TABLET_WIDTH)
    const wrapper = await mountResults()

    expect(headers(wrapper)).not.toContain('ЛХ')
    const lines = wrapper.findAll('.best-move-line')
    expect(lines).toHaveLength(1)
    expect(bodyRows(wrapper)[3].find('.best-move-line').exists()).toBe(true)
    expect(lines[0].find('.best-move-label').text()).toBe('ЛХ')
    expect(lines[0].find('.positive-score').text()).toBe('+0.5')
    expect(boxesOf(lines[0])).toEqual([['3', 'чёрный'], ['5', 'чёрный'], ['9', 'красный']])
  })

  it('на телефоне отметка и ЛХ - только в карточке ПУ', async () => {
    setViewport(MOBILE_WIDTH)
    const wrapper = await mountResults(gameDetail({
      firstKilled: { box_id: 4, is_black: false, best_move_box_ids: null, best_move_hits: null },
      bestMovePoints: 0
    }))

    expect(wrapper.findComponent(ElTable).exists()).toBe(false)
    const cards = wrapper.findAll('.player-result-card')
    expect(cards).toHaveLength(10)
    const withBestMove = cards.filter((card) => card.find('.best-move-line').exists())
    expect(withBestMove).toHaveLength(1)
    expect(withBestMove[0].text()).toContain('Игрок 4')
    expect(withBestMove[0].text()).toContain('ПУ')
    expect(withBestMove[0].find('.best-move-line').text()).toContain('не заявлен')
    expect(cards[0].text()).not.toContain('ПУ')
  })

  it('сохраняет только допы, штрафы и комментарии, а ЛХ перечитывает у сервера', async () => {
    apiService.setPlayersPoints.mockResolvedValue({})
    const wrapper = await mountResults()

    const extraInput = bodyRows(wrapper)[3].findComponent(ElInputNumber)
    extraInput.vm.$emit('update:modelValue', 0.6)
    extraInput.vm.$emit('change', 0.6)
    await flushPromises()
    // до сохранения баллы за ЛХ прежние: пересчитывает их только сервер
    expect(wrapper.find('.best-move-cell .positive-score').text()).toBe('+0.5')

    // ФИИМ классика: допы 0.6 выше ЛХ 0.5 и поглотили его
    const saved = gameDetail({ bestMovePoints: 0 })
    saved.players[3].extra_points = 0.6
    apiService.getGame.mockResolvedValue(saved)
    await wrapper.find('.header-actions button').trigger('click')
    await flushPromises()

    expect(apiService.setPlayersPoints).toHaveBeenCalledTimes(1)
    const [gameId, players] = apiService.setPlayersPoints.mock.calls[0]
    expect(gameId).toBe('game-1')
    expect(players).toHaveLength(10)
    expect(players[3]).toEqual({ box_id: 4, extra_points: 0.6, penalty_points: 0, comment: null })
    players.forEach((player) => {
      expect(Object.keys(player).sort()).toEqual(['box_id', 'comment', 'extra_points', 'penalty_points'])
    })
    const cell = wrapper.find('.best-move-cell')
    expect(cell.find('.positive-score').exists()).toBe(false)
    expect(boxesOf(cell)).toEqual([['3', 'чёрный'], ['5', 'чёрный'], ['9', 'красный']])
  })
})
