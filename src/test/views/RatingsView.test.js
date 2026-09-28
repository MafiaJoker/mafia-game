// Рейтинг за период: порядок строк и все проценты считает сервер, поэтому
// проверяем то, за что отвечает страница - какие колонки видны, что уходит
// в запрос и как выглядит разбивка по ролям под строкой игрока

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { ElTable, ElInputNumber } from 'element-plus'
import RatingsView from '@/views/RatingsView.vue'
import EloRatings from '@/components/ratings/EloRatings.vue'
import { apiService } from '@/services/api'

// Адрес реактивный, как настоящий: экран следит за вкладкой в нём
const { route, routerReplace } = await vi.hoisted(async () => {
  const { reactive } = await import('vue')
  return { route: reactive({ query: {} }), routerReplace: vi.fn() }
})

vi.mock('@/services/api', () => ({
  apiService: {
    getRatings: vi.fn(),
    getRuleSystems: vi.fn()
  },
  initApiUrl: vi.fn()
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => route,
  useRouter: () => ({ replace: routerReplace })
}))

vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

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

// Вкладку ELO проверяет свой тест, здесь важно только, открыта ли она
const mountRatings = async (rows = [ratingRow()]) => {
  apiService.getRatings.mockResolvedValue(rows)
  const wrapper = mount(RatingsView, {
    global: { stubs: { EloRatings: true } }
  })
  await flushPromises()
  return wrapper
}

// Обёртки прошлых тестов не должны жить дальше: ширина экрана у всех общая,
// и её смена перерисовывала бы каждую, растягивая тест на секунды
enableAutoUnmount(afterEach)

describe('RatingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setViewport(DESKTOP_WIDTH)
    route.query = {}
    apiService.getRuleSystems.mockResolvedValue([{ slug: 'fiim', label: 'ФИИМ' }])
  })

  it('по умолчанию открыт рейтинг по очкам, а ELO не грузится', async () => {
    const wrapper = await mountRatings()

    expect(wrapper.find('#tab-points').classes()).toContain('is-active')
    expect(wrapper.findComponent(ElTable).exists()).toBe(true)
    expect(wrapper.findComponent(EloRatings).exists()).toBe(false)
  })

  it('вкладка из адреса открывается сразу', async () => {
    route.query = { tab: 'elo' }
    const wrapper = await mountRatings()

    expect(wrapper.find('#tab-elo').classes()).toContain('is-active')
    expect(wrapper.findComponent(EloRatings).exists()).toBe(true)
  })

  it('незнакомая вкладка в адресе - не ошибка, а рейтинг по очкам', async () => {
    route.query = { tab: 'glicko' }
    const wrapper = await mountRatings()

    expect(wrapper.find('#tab-points').classes()).toContain('is-active')
    expect(wrapper.findComponent(EloRatings).exists()).toBe(false)
  })

  it('адрес сменился без клика по вкладке - вкладка идёт за ним', async () => {
    route.query = { tab: 'elo' }
    const wrapper = await mountRatings()

    // «Рейтинг» в шапке, логотип или «назад»: тот же экран, адрес без вкладки
    route.query = {}
    await flushPromises()
    expect(wrapper.find('#tab-points').classes()).toContain('is-active')

    route.query = { tab: 'elo' }
    await flushPromises()
    expect(wrapper.find('#tab-elo').classes()).toContain('is-active')
    // вкладку сменил адрес - писать его заново незачем
    expect(routerReplace).not.toHaveBeenCalled()
  })

  it('открыли по ссылке на ELO - рейтинг по очкам не грузится, пока не откроют его вкладку', async () => {
    route.query = { tab: 'elo' }
    const wrapper = await mountRatings()

    expect(apiService.getRatings).not.toHaveBeenCalled()
    expect(apiService.getRuleSystems).not.toHaveBeenCalled()
    expect(wrapper.findComponent(ElTable).exists()).toBe(false)

    await wrapper.find('#tab-points').trigger('click')
    await flushPromises()
    await wrapper.find('#tab-elo').trigger('click')
    await flushPromises()
    await wrapper.find('#tab-points').trigger('click')
    await flushPromises()

    // второй заход на вкладку данные не перезапрашивает
    expect(apiService.getRatings).toHaveBeenCalledTimes(1)
    expect(apiService.getRuleSystems).toHaveBeenCalledTimes(1)
    expect(wrapper.findComponent(ElTable).exists()).toBe(true)
  })

  it('выбранная вкладка уходит в адрес, а вкладка по умолчанию его не засоряет', async () => {
    const wrapper = await mountRatings()

    await wrapper.find('#tab-elo').trigger('click')
    await flushPromises()

    expect(routerReplace).toHaveBeenLastCalledWith({ query: { tab: 'elo' } })
    expect(wrapper.findComponent(EloRatings).exists()).toBe(true)

    await wrapper.find('#tab-points').trigger('click')
    await flushPromises()

    expect(routerReplace).toHaveBeenLastCalledWith({ query: { tab: undefined } })
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
