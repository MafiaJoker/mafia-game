// Турнирная таблица мероприятия: сумму допов, порядок строк и MVP считает сервер,
// поэтому проверяем то, за что отвечает страница - откуда колонка «Доп.» берёт значение,
// как его подсвечивает, как ведёт себя подсказка с формулой в заголовке
// и как подписаны место игрока и MVP

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ElTable, ElTooltip } from 'element-plus'
import EventResults from '@/components/events/EventResults.vue'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    getEventRatings: vi.fn(),
    getGame: vi.fn()
  }
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: vi.fn() })
}))

const DESKTOP_WIDTH = 1280
const MOBILE_WIDTH = 375

// Колонки таблицы игроков: Место, Игрок, Балл, Доп., Штраф, В/П
const PLACE_COLUMN = 0
const PLAYER_COLUMN = 1
const EXTRA_POINTS_COLUMN = 3

const setViewport = (width) => {
  window.innerWidth = width
}

const scoreboardRow = (overrides = {}) => ({
  user: { id: 'user-1', nickname: 'Барон' },
  position: 1,
  all_points_summary: 2.3,
  auto_points_summary: 1.6,
  extra_points_summary: 0,
  penalty_points_summary: 0,
  best_move_points_summary: 0.7,
  ci_summary: 0,
  total_extra_points_summary: 0.7,
  ...overrides
})

const mountResults = async (rows = [scoreboardRow()], mvpRow = rows[0]) => {
  apiService.getEventRatings.mockResolvedValue({
    mvp: { id: mvpRow.user.id, nickname: mvpRow.user.nickname, points: mvpRow.total_extra_points_summary },
    stages: [{ id: 0, label: null, points_multiplier: null, stage_scoreboard: rows }]
  })
  const wrapper = mount(EventResults, {
    props: { event: { id: 'event-1', tables: [] } },
    attachTo: document.body
  })
  await flushPromises()
  return wrapper
}

const playersTable = (wrapper) => wrapper.findComponent(ElTable)
const bodyRows = (wrapper) => playersTable(wrapper).findAll('.el-table__body tr')
const playerCells = (wrapper) => bodyRows(wrapper).map((row) => row.findAll('td')[PLAYER_COLUMN])
const nicknames = (wrapper) => playerCells(wrapper).map((cell) => cell.find('.player-name').text())
const places = (wrapper) => bodyRows(wrapper).map((row) => row.findAll('td')[PLACE_COLUMN].text())
const extraPointsValue = (wrapper, rowIndex) => (
  bodyRows(wrapper)[rowIndex].findAll('td')[EXTRA_POINTS_COLUMN].find('span')
)
const extraPointsHeader = (wrapper) => playersTable(wrapper).findAll('th')[EXTRA_POINTS_COLUMN]
const hintTooltip = (wrapper) => (
  wrapper.findAllComponents(ElTooltip).find((tooltip) => tooltip.find('.hint-icon').exists())
)

let wrapper

beforeEach(() => {
  vi.clearAllMocks()
  setViewport(DESKTOP_WIDTH)
})

afterEach(() => {
  wrapper?.unmount()
  setViewport(DESKTOP_WIDTH)
})

describe('EventResults: колонка «Суммарные доп. баллы»', () => {
  it('показывает сумму допов с сервера, а не одни доп. баллы', async () => {
    wrapper = await mountResults([
      // ЛХ без допов: до правки колонка показывала +0
      scoreboardRow({ user: { id: 'user-1', nickname: 'ЛХ' }, total_extra_points_summary: 0.7 }),
      // допы со штрафом: до правки колонка показывала +0.5
      scoreboardRow({
        user: { id: 'user-2', nickname: 'Допы' },
        position: 2,
        extra_points_summary: 0.5,
        penalty_points_summary: 0.3,
        best_move_points_summary: 0,
        total_extra_points_summary: 0.2
      })
    ])

    expect(extraPointsValue(wrapper, 0).text()).toBe('+0.7')
    expect(extraPointsValue(wrapper, 1).text()).toBe('+0.2')
  })

  it('отрицательную сумму - штраф больше допов - красит красным', async () => {
    wrapper = await mountResults([
      scoreboardRow({
        extra_points_summary: 0.2,
        penalty_points_summary: 0.9,
        best_move_points_summary: 0,
        total_extra_points_summary: -0.7
      })
    ])

    const value = extraPointsValue(wrapper, 0)
    expect(value.text()).toBe('-0.7')
    expect(value.classes()).toContain('negative-score')
    expect(value.classes()).not.toContain('positive-score')
  })

  it('в заголовке подсказка с формулой, на компьютере - по наведению', async () => {
    wrapper = await mountResults()

    expect(extraPointsHeader(wrapper).text()).toContain('Суммарные доп. баллы')
    expect(extraPointsHeader(wrapper).find('.hint-icon').exists()).toBe(true)
    expect(hintTooltip(wrapper).props('trigger')).toBe('hover')
    expect(document.body.textContent).toContain('Доп. баллы − штрафы + лучший ход (ЛХ)')
    expect(document.body.textContent).toContain('Ci) сюда не входит')
  })

  it('клик по иконке подсказки не сортирует колонку, клик по заголовку - сортирует', async () => {
    wrapper = await mountResults([
      scoreboardRow({ user: { id: 'user-1', nickname: 'ЛХ' }, position: 1, total_extra_points_summary: 0.7 }),
      scoreboardRow({ user: { id: 'user-2', nickname: 'Штраф' }, position: 2, total_extra_points_summary: -0.7 })
    ])

    await extraPointsHeader(wrapper).find('.hint-icon').trigger('click')
    await flushPromises()

    expect(playersTable(wrapper).emitted('sort-change')).toBeUndefined()
    expect(nicknames(wrapper)).toEqual(['ЛХ', 'Штраф'])

    await extraPointsHeader(wrapper).trigger('click')
    await flushPromises()

    expect(playersTable(wrapper).emitted('sort-change')).toHaveLength(1)
    expect(nicknames(wrapper)).toEqual(['Штраф', 'ЛХ'])
  })

  it('на телефоне подпись «Доп.», а подсказка открывается тапом', async () => {
    setViewport(MOBILE_WIDTH)
    wrapper = await mountResults()

    expect(extraPointsHeader(wrapper).text()).toContain('Доп.')
    expect(extraPointsHeader(wrapper).text()).not.toContain('Суммарные')
    expect(hintTooltip(wrapper).props('trigger')).toBe('click')
  })
})

describe('EventResults: место и MVP', () => {
  // MVP - лучший по сумме допов, и это не первое место
  const ROWS = [
    scoreboardRow({ user: { id: 'user-1', nickname: 'Аргон' }, position: 1, total_extra_points_summary: 0 }),
    scoreboardRow({ user: { id: 'user-2', nickname: 'Бор' }, position: 2, total_extra_points_summary: -0.2 }),
    scoreboardRow({ user: { id: 'user-3', nickname: 'ЛХ без допов' }, position: 3, total_extra_points_summary: 0.7 })
  ]
  const MVP_ROW = ROWS[2]

  it('в первой колонке место игрока из турнирной таблицы', async () => {
    wrapper = await mountResults(ROWS, MVP_ROW)

    expect(playersTable(wrapper).findAll('th')[PLACE_COLUMN].text()).toBe('Место')
    expect(places(wrapper)).toEqual(['1', '2', '3'])
    expect(nicknames(wrapper)).toEqual(['Аргон', 'Бор', 'ЛХ без допов'])
  })

  it('место остаётся за игроком, когда таблицу отсортировали по другой колонке', async () => {
    wrapper = await mountResults(ROWS, MVP_ROW)

    await extraPointsHeader(wrapper).trigger('click')
    await flushPromises()

    expect(nicknames(wrapper)).toEqual(['Бор', 'Аргон', 'ЛХ без допов'])
    expect(places(wrapper)).toEqual(['2', '1', '3'])
  })

  it('MVP подписан словом у своего игрока, а не кубком', async () => {
    wrapper = await mountResults(ROWS, MVP_ROW)

    const labels = playerCells(wrapper).map((cell) => cell.find('.mvp-label'))
    expect(labels.map((label) => label.exists())).toEqual([false, false, true])
    expect(labels[2].text()).toBe('MVP')
    // Надпись справа от ника
    expect(playerCells(wrapper)[2].text()).toBe('ЛХ без допов MVP')
    expect(playerCells(wrapper).some((cell) => cell.find('.el-icon').exists())).toBe(false)
  })
})
