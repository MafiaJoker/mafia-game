// Рейтинг за период: порядок строк и все проценты считает сервер, поэтому
// проверяем то, за что отвечает страница - какие колонки видны, что уходит
// в запрос и как выглядит разбивка по ролям под строкой игрока

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ElTable, ElInputNumber } from 'element-plus'
import RatingsView from '@/views/RatingsView.vue'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    getRatings: vi.fn(),
    getRuleSystems: vi.fn()
  },
  initApiUrl: vi.fn()
}))

const DESKTOP_WIDTH = 1280
const MOBILE_WIDTH = 375

const setViewport = (width) => {
  window.innerWidth = width
}

const ratingRow = (overrides = {}) => ({
  user: { id: 'user-1', nickname: 'Барон' },
  position: 1,
  all_points_summary: 16.2,
  auto_points_summary: 15,
  extra_points_summary: 1.7,
  penalty_points_summary: 0.5,
  best_move_points_summary: 0,
  ci_summary: 0,
  games_counter: 10,
  average_points_per_game: 1.62,
  win_percentage: 60,
  roles_stats: {
    mafia: { games_counter: 4, win_percentage: 50 },
    don: { games_counter: 0, win_percentage: 0 },
    sheriff: { games_counter: 1, win_percentage: 100 },
    civilian: { games_counter: 5, win_percentage: 60 }
  },
  ...overrides
})

const mountRatings = async (rows = [ratingRow()]) => {
  apiService.getRatings.mockResolvedValue(rows)
  const wrapper = mount(RatingsView)
  await flushPromises()
  return wrapper
}

describe('RatingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setViewport(DESKTOP_WIDTH)
    apiService.getRuleSystems.mockResolvedValue([{ slug: 'fiim', label: 'ФИИМ' }])
  })

  afterEach(() => {
    setViewport(DESKTOP_WIDTH)
  })

  it('по умолчанию просит у сервера игроков от пяти игр', async () => {
    await mountRatings()

    expect(apiService.getRatings).toHaveBeenCalledWith(
      expect.objectContaining({ rule_system: 'fiim', min_games: 5 })
    )
  })

  it('отсечку по играм можно сменить, и рейтинг перезагружается с новой', async () => {
    const wrapper = await mountRatings()

    wrapper.findComponent(ElInputNumber).vm.$emit('update:modelValue', 10)
    wrapper.findComponent(ElInputNumber).vm.$emit('change', 10)
    await flushPromises()

    expect(apiService.getRatings).toHaveBeenLastCalledWith(
      expect.objectContaining({ min_games: 10 })
    )
  })

  it('очищенное поле отсечки читает как «все игроки»', async () => {
    const wrapper = await mountRatings()

    wrapper.findComponent(ElInputNumber).vm.$emit('update:modelValue', null)
    wrapper.findComponent(ElInputNumber).vm.$emit('change', null)
    await flushPromises()

    expect(apiService.getRatings).toHaveBeenLastCalledWith(
      expect.objectContaining({ min_games: 0 })
    )
  })

  it('пустой ответ с отсечкой объясняет, что срезала именно она', async () => {
    const wrapper = await mountRatings([])

    expect(wrapper.text()).toContain('нет игроков с 5 и более играми')
  })

  it('показывает средний балл, число игр и процент побед, а CI больше не показывает', async () => {
    const wrapper = await mountRatings()
    const text = wrapper.text()

    expect(text).toContain('Средний балл')
    expect(text).toContain('1.62')
    expect(text).toContain('Игр')
    expect(text).toContain('10')
    expect(text).toContain('60.0%')
    // В рейтинге за период CI всегда нулевой - колонки нет
    expect(text).not.toContain('CI')
  })

  it('порядок строк не трогает: как отдал сервер, так и рисует', async () => {
    const wrapper = await mountRatings([
      ratingRow({ user: { id: 'user-1', nickname: 'Ёрш' }, position: 1, all_points_summary: 14.6, average_points_per_game: 1.46 }),
      ratingRow({ user: { id: 'user-2', nickname: 'Зодиак' }, position: 2, all_points_summary: 15, average_points_per_game: 1.36 })
    ])

    const nicknames = wrapper.findAll('.player-name').map((cell) => cell.text())
    expect(nicknames).toEqual(['Ёрш', 'Зодиак'])
  })

  it('по клику на строку раскрывает разбивку по ролям', async () => {
    const wrapper = await mountRatings()

    expect(wrapper.text()).not.toContain('Побед по ролям')

    await wrapper.findComponent(ElTable).vm.$emit('row-click', wrapper.vm.ratings[0])
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Побед по ролям')
    expect(text).toContain('Мирный')
    expect(text).toContain('Шериф')
    expect(text).toContain('Мафия')
    expect(text).toContain('Дон')
    expect(text).toContain('100.0%')
  })

  it('роль, за которую игрок не играл, показывает «игр нет», а не нулевой процент', async () => {
    const wrapper = await mountRatings()

    await wrapper.findComponent(ElTable).vm.$emit('row-click', wrapper.vm.ratings[0])
    await flushPromises()

    const don = wrapper.findAll('.role-cell').find((cell) => cell.text().includes('Дон'))
    expect(don.text()).toContain('игр нет')
    expect(don.text()).not.toContain('0.0%')
  })

  it('на телефоне вместо таблицы список: средний балл, число игр и процент в строке', async () => {
    setViewport(MOBILE_WIDTH)
    const wrapper = await mountRatings()

    expect(wrapper.findComponent(ElTable).exists()).toBe(false)
    const row = wrapper.find('.rating-row')
    expect(row.text()).toContain('1.62')
    expect(row.text()).toContain('10 игр')
    expect(row.text()).toContain('60.0%')

    await row.trigger('click')
    await flushPromises()

    const details = wrapper.find('.rating-details').text()
    expect(details).toContain('Побед по ролям')
    expect(details).toContain('игр нет')
    expect(details).not.toContain('CI')
  })
})
