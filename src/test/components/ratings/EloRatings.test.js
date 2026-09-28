// ELO-вкладка рейтинга: место и рейтинг считает сервер, поэтому проверяем то,
// за что отвечает страница - какой профиль, страницу и период изменения она
// просит, чем объясняет пустую таблицу и чей график открывает

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElTable, ElPagination, ElSelect } from 'element-plus'
import EloRatings from '@/components/ratings/EloRatings.vue'
import EloPlayerTrace from '@/components/ratings/EloPlayerTrace.vue'
import { apiService } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/services/api', () => ({
  apiService: {
    getEloProfiles: vi.fn(),
    getEloRatings: vi.fn(),
    getEloPlayerTrace: vi.fn()
  },
  initApiUrl: vi.fn()
}))

vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

const DESKTOP_WIDTH = 1280
const MOBILE_WIDTH = 375

const ME = { id: 'user-me', nickname: 'Батон', roles: ['player'] }

// «Сегодня» для периода изменения: неделя до него - с 21 сентября
const TODAY = new Date(2026, 8, 27, 12, 0)

const setViewport = (width) => {
  window.innerWidth = width
}

const profile = (overrides = {}) => ({
  id: 'profile-fiim',
  name: 'ФИИМ',
  rule_systems: ['fiim'],
  event_type_ids: [],
  is_default: true,
  date_from: null,
  // полдень по UTC - 21 сентября в любом часовом поясе прогона
  updated_at: '2026-09-21T12:00:00Z',
  games_count: 123,
  ...overrides
})

const ratingRow = (overrides = {}) => ({
  user: { id: 'user-1', nickname: 'Барон' },
  position: 1,
  rating: 1087,
  games_counter: 34,
  delta: null,
  ...overrides
})

const page = (items, total = items.length) => ({ items, total, limit: 20, offset: 0 })

const profileNotFound = () => ({
  response: { status: 404, data: { status_code: 404, detail: 'elo profile not found' } }
})

const mountElo = async ({ profiles = [profile()], ratings = page([ratingRow()]), user = ME } = {}) => {
  apiService.getEloProfiles.mockResolvedValue(profiles)
  // undefined - ответы таблицы тест задал сам
  if (ratings !== undefined) apiService.getEloRatings.mockResolvedValue(ratings)
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = user
  const wrapper = mount(EloRatings, { global: { plugins: [pinia] } })
  await flushPromises()
  return wrapper
}

const chart = (wrapper) => wrapper.findComponent(EloPlayerTrace)

const retryButton = (wrapper) => wrapper.findAll('button').find((button) => button.text() === 'Повторить')

const goToPage = async (wrapper, pageNumber) => {
  wrapper.findComponent(ElPagination).vm.$emit('update:current-page', pageNumber)
  wrapper.findComponent(ElPagination).vm.$emit('current-change', pageNumber)
  await flushPromises()
}

// Обёртки прошлых тестов не должны жить дальше: ширина экрана у всех общая,
// и её смена перерисовывала бы каждую, растягивая тест на секунды
enableAutoUnmount(afterEach)

describe('EloRatings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // подменяем только часы: таймеры нужны flushPromises
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(TODAY)
    setViewport(DESKTOP_WIDTH)
    apiService.getEloPlayerTrace.mockResolvedValue({
      user: { id: ME.id, nickname: ME.nickname },
      profile_id: 'profile-fiim',
      calibration_games_left: 0,
      points: [
        {
          game_id: 'game-1',
          played_at: '2026-09-01',
          rating: 1006,
          delta: 6.3,
          delta_outcome: 5.28,
          delta_personal: 1.02,
          expected: 0.56,
          team_rating: 1000,
          opponents_rating: 1000,
          role: 'civilian',
          score: 1
        }
      ]
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    setViewport(DESKTOP_WIDTH)
  })

  it('открывает профиль по умолчанию и просит у сервера первую страницу по нему', async () => {
    await mountElo({
      profiles: [
        profile({ id: 'profile-imafia', name: 'iMafia', is_default: false }),
        profile({ id: 'profile-fiim', name: 'ФИИМ', is_default: true })
      ]
    })

    expect(apiService.getEloRatings).toHaveBeenCalledWith({
      profile_id: 'profile-fiim',
      currentPage: 1,
      pageSize: 20,
      start_date: '2026-09-21'
    })
  })

  it('изменение просит за 7 дней, считая сегодняшний, в том числе через границу месяца', async () => {
    vi.setSystemTime(new Date(2026, 9, 3, 12, 0))
    await mountElo()

    expect(apiService.getEloRatings).toHaveBeenCalledWith(
      expect.objectContaining({ start_date: '2026-09-27' })
    )
  })

  it('изменение за неделю: рост и падение со знаком, новичок в таблице - словом', async () => {
    const wrapper = await mountElo({
      ratings: page([
        ratingRow({ delta: 12 }),
        ratingRow({ user: { id: 'user-2', nickname: 'Зодиак' }, position: 2, delta: -5 }),
        ratingRow({ user: { id: 'user-3', nickname: 'Ёрш' }, position: 3, delta: 0 }),
        ratingRow({ user: { id: 'user-4', nickname: 'Лиса' }, position: 4, delta: null })
      ])
    })
    const deltas = wrapper.findComponent(ElTable).findAll('.el-table__body .delta')

    expect(wrapper.findComponent(ElTable).find('thead').text()).toContain('За неделю')
    expect(deltas.map((delta) => delta.text())).toEqual(['+12', '−5', '±0', 'новый'])
    expect(deltas.map((delta) => delta.classes().find((name) => name.startsWith('is-'))))
      .toEqual(['is-up', 'is-down', 'is-flat', 'is-new'])
  })

  it('подписывает таблицу датой последнего изменения рейтинга, без числа игр в нём', async () => {
    const wrapper = await mountElo()

    expect(wrapper.find('.profile-meta').text()).toBe('Обновлён 21 сентября 2026 г.')
  })

  it('у сезонного профиля называет начало истории', async () => {
    const wrapper = await mountElo({ profiles: [profile({ date_from: '2026-01-01' })] })

    expect(wrapper.text()).toContain('игры с 1 января 2026 г.')
  })

  it('рисует место, ник, рейтинг и число игр так, как отдал сервер', async () => {
    const wrapper = await mountElo({
      ratings: page([
        ratingRow(),
        ratingRow({ user: { id: 'user-2', nickname: 'Зодиак' }, position: 2, rating: 1054, games_counter: 57 })
      ])
    })
    const rows = wrapper.findComponent(ElTable).findAll('.el-table__body tr')

    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Барон')
    expect(rows[0].text()).toContain('1087')
    expect(rows[0].text()).toContain('34')
    expect(rows[1].text()).toContain('Зодиак')
    expect(rows[1].text()).toContain('1054')
    expect(wrapper.text()).toContain('В таблице 2 игрока')
  })

  it('свою строку помечает, чтобы найти себя в таблице', async () => {
    const wrapper = await mountElo({
      ratings: page([ratingRow(), ratingRow({ user: { id: ME.id, nickname: ME.nickname }, position: 2 })])
    })
    const rows = wrapper.findComponent(ElTable).findAll('.el-table__body tr')
    // метку ищем тегом: «вы» есть и внутри слова «новый» в колонке изменения
    const meTag = (row) => row.findAll('.el-tag').some((tag) => tag.text() === 'вы')

    expect(meTag(rows[0])).toBe(false)
    expect(meTag(rows[1])).toBe(true)
  })

  it('в профиле ещё нет игр - объясняет это текстом и таблицу не просит', async () => {
    const wrapper = await mountElo({ profiles: [profile({ updated_at: null, games_count: 0 })] })

    expect(wrapper.find('.profile-meta').text()).toBe('Игр пока нет')
    expect(wrapper.text()).toContain('В этом рейтинге пока нет игр')
    expect(apiService.getEloRatings).not.toHaveBeenCalled()
    expect(chart(wrapper).exists()).toBe(false)
  })

  it('профиль пропал, пока страница открыта, - просит обновить её вместо таблицы', async () => {
    apiService.getEloProfiles.mockResolvedValue([profile()])
    apiService.getEloRatings.mockRejectedValue(profileNotFound())
    const pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().user = ME
    const wrapper = mount(EloRatings, { global: { plugins: [pinia] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Профиль рейтинга не найден. Обновите страницу')
    expect(wrapper.findComponent(ElTable).exists()).toBe(false)
  })

  it('профилей нет - говорит, что ELO не настроен', async () => {
    const wrapper = await mountElo({ profiles: [] })

    expect(wrapper.text()).toContain('ELO-рейтинг пока не настроен')
    expect(apiService.getEloRatings).not.toHaveBeenCalled()
  })

  it('в таблице никого - объясняет это калибровкой и простоем, а не пустой таблицей', async () => {
    const wrapper = await mountElo({ ratings: page([]) })

    expect(wrapper.findComponent(ElTable).exists()).toBe(false)
    expect(wrapper.text()).toContain('место в ней появляется после калибровочных игр')
    expect(wrapper.text()).toContain('а тех, кто давно не играл, она не показывает')
    expect(wrapper.text()).not.toContain('Повторить')
  })

  it('первая загрузка таблицы сорвалась - «Повторить» просит её снова', async () => {
    apiService.getEloRatings
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(page([ratingRow()]))
    const wrapper = await mountElo({ ratings: undefined })

    expect(wrapper.text()).toContain('Не удалось загрузить таблицу')
    await retryButton(wrapper).trigger('click')
    await flushPromises()

    expect(apiService.getEloRatings).toHaveBeenCalledTimes(2)
    expect(wrapper.findComponent(ElTable).text()).toContain('Барон')
  })

  it('страница не загрузилась - пагинация остаётся, страницу можно повторить', async () => {
    const wrapper = await mountElo({ ratings: page([ratingRow()], 45) })
    apiService.getEloRatings
      .mockRejectedValueOnce(new Error('timeout of 10000ms exceeded'))
      .mockResolvedValueOnce(page([ratingRow({ user: { id: 'user-2', nickname: 'Зодиак' } })], 45))

    await goToPage(wrapper, 2)

    expect(wrapper.text()).toContain('Не удалось загрузить таблицу')
    expect(wrapper.findComponent(ElPagination).exists()).toBe(true)
    expect(wrapper.text()).toContain('В таблице 45 игроков')

    await retryButton(wrapper).trigger('click')
    await flushPromises()

    expect(apiService.getEloRatings).toHaveBeenLastCalledWith(expect.objectContaining({ currentPage: 2 }))
    expect(wrapper.findComponent(ElTable).text()).toContain('Зодиак')
  })

  it('таблица укоротилась, пока её листали, - уходит на последнюю страницу', async () => {
    const wrapper = await mountElo({ ratings: page([ratingRow()], 25) })
    apiService.getEloRatings
      .mockResolvedValueOnce(page([], 19))
      .mockResolvedValueOnce(page([ratingRow({ user: { id: 'user-2', nickname: 'Зодиак' } })], 19))

    await goToPage(wrapper, 2)

    expect(apiService.getEloRatings).toHaveBeenLastCalledWith(expect.objectContaining({ currentPage: 1 }))
    expect(wrapper.findComponent(ElTable).text()).toContain('Зодиак')
    expect(wrapper.text()).toContain('В таблице 19 игроков')
  })

  it('смена профиля перезагружает таблицу с первой страницы', async () => {
    const wrapper = await mountElo({
      profiles: [profile(), profile({ id: 'profile-imafia', name: 'iMafia', is_default: false })],
      ratings: page([ratingRow()], 45)
    })

    wrapper.findComponent(ElPagination).vm.$emit('update:current-page', 2)
    wrapper.findComponent(ElPagination).vm.$emit('current-change', 2)
    await flushPromises()

    wrapper.findComponent(ElSelect).vm.$emit('update:modelValue', 'profile-imafia')
    wrapper.findComponent(ElSelect).vm.$emit('change', 'profile-imafia')
    await flushPromises()

    expect(apiService.getEloRatings).toHaveBeenLastCalledWith({
      profile_id: 'profile-imafia',
      currentPage: 1,
      pageSize: 20,
      start_date: '2026-09-21'
    })
  })

  it('страницы листаются: следующую просит у сервера', async () => {
    const wrapper = await mountElo({ ratings: page([ratingRow()], 45) })

    await goToPage(wrapper, 2)

    expect(apiService.getEloRatings).toHaveBeenLastCalledWith(
      expect.objectContaining({ currentPage: 2, pageSize: 20 })
    )
  })

  it('одна страница - без пагинации', async () => {
    const wrapper = await mountElo()

    expect(wrapper.findComponent(ElPagination).exists()).toBe(false)
  })

  it('ответ по прошлому профилю не перетирает таблицу нового', async () => {
    let resolveFirst
    apiService.getEloProfiles.mockResolvedValue([
      profile(),
      profile({ id: 'profile-imafia', name: 'iMafia', is_default: false })
    ])
    apiService.getEloRatings
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
      .mockResolvedValueOnce(page([ratingRow({ user: { id: 'user-2', nickname: 'Зодиак' } })]))
    const pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().user = ME
    const wrapper = mount(EloRatings, { global: { plugins: [pinia] } })
    await flushPromises()

    wrapper.findComponent(ElSelect).vm.$emit('update:modelValue', 'profile-imafia')
    wrapper.findComponent(ElSelect).vm.$emit('change', 'profile-imafia')
    await flushPromises()
    resolveFirst(page([ratingRow()]))
    await flushPromises()

    const text = wrapper.findComponent(ElTable).text()
    expect(text).toContain('Зодиак')
    expect(text).not.toContain('Барон')
  })

  it('по умолчанию график свой', async () => {
    const wrapper = await mountElo()

    expect(chart(wrapper).props('player')).toEqual({ id: ME.id, nickname: ME.nickname })
    expect(chart(wrapper).props('isMe')).toBe(true)
    expect(apiService.getEloPlayerTrace).toHaveBeenCalledWith(ME.id, { profile_id: 'profile-fiim' })
  })

  it('клик по строке открывает график этого игрока и подсвечивает строку', async () => {
    const wrapper = await mountElo()

    await wrapper.findComponent(ElTable).vm.$emit('row-click', ratingRow())
    await flushPromises()

    expect(chart(wrapper).props('player')).toEqual({ id: 'user-1', nickname: 'Барон' })
    expect(chart(wrapper).props('isMe')).toBe(false)
    expect(apiService.getEloPlayerTrace).toHaveBeenLastCalledWith('user-1', { profile_id: 'profile-fiim' })
    expect(wrapper.find('.el-table__body tr').classes()).toContain('is-selected')
  })

  it('«Мой график» возвращает к себе', async () => {
    const wrapper = await mountElo()

    expect(chart(wrapper).props('canShowMine')).toBe(false)
    await wrapper.findComponent(ElTable).vm.$emit('row-click', ratingRow())
    await flushPromises()
    expect(chart(wrapper).props('canShowMine')).toBe(true)
    chart(wrapper).vm.$emit('reset')
    await flushPromises()

    expect(chart(wrapper).props('player')).toEqual({ id: ME.id, nickname: ME.nickname })
    expect(chart(wrapper).props('isMe')).toBe(true)
    expect(chart(wrapper).props('canShowMine')).toBe(false)
  })

  it('без своего пользователя «Мой график» не предлагается', async () => {
    const wrapper = await mountElo({ user: null })

    await wrapper.findComponent(ElTable).vm.$emit('row-click', ratingRow())
    await flushPromises()

    expect(chart(wrapper).props('player')).toEqual({ id: 'user-1', nickname: 'Барон' })
    expect(chart(wrapper).props('canShowMine')).toBe(false)
  })

  it('на компьютере ник - кнопка: график открывается и с клавиатуры', async () => {
    const wrapper = await mountElo()
    const button = wrapper.find('.el-table__body .player-button')

    expect(button.element.tagName).toBe('BUTTON')
    expect(button.attributes('aria-label')).toBe('Барон: показать график')
    await button.trigger('click')
    await flushPromises()

    expect(chart(wrapper).props('player')).toEqual({ id: 'user-1', nickname: 'Барон' })
    expect(wrapper.find('.el-table__body .player-button').attributes('aria-current')).toBe('true')
    // клик по кнопке не всплывает до строки: график просится один раз
    expect(apiService.getEloPlayerTrace).toHaveBeenLastCalledWith('user-1', { profile_id: 'profile-fiim' })
    expect(apiService.getEloPlayerTrace.mock.calls.filter(([id]) => id === 'user-1')).toHaveLength(1)
  })

  it('подсказка к «За неделю» - кнопка, до неё доходят табом', async () => {
    const wrapper = await mountElo()
    const hint = wrapper.findComponent(ElTable).find('thead button.hint-icon')

    expect(hint.exists()).toBe(true)
    expect(hint.attributes('aria-label')).toBe('Что значит «За неделю»')
  })

  it('на телефоне вместо таблицы список, тап по строке открывает график игрока', async () => {
    setViewport(MOBILE_WIDTH)
    const wrapper = await mountElo({
      ratings: page([
        ratingRow({ delta: 12 }),
        ratingRow({ user: { id: 'user-2', nickname: 'Зодиак' }, position: 2, delta: null })
      ])
    })

    expect(wrapper.findComponent(ElTable).exists()).toBe(false)
    expect(wrapper.findAll('.rating-row')[0].text()).toContain('+12 за неделю')
    expect(wrapper.findAll('.rating-row')[1].text()).toContain('новый')
    expect(wrapper.findAll('.rating-row')[1].text()).not.toContain('за неделю')
    const row = wrapper.find('.rating-row')
    expect(row.text()).toContain('Барон')
    expect(row.text()).toContain('1087')
    expect(row.text()).toContain('34 игры')

    await row.trigger('click')
    await flushPromises()

    expect(chart(wrapper).props('player')).toEqual({ id: 'user-1', nickname: 'Барон' })
    expect(wrapper.find('.rating-row').classes()).toContain('is-selected')
  })

  it('на телефоне строку открывают с клавиатуры - и Enter, и пробелом', async () => {
    setViewport(MOBILE_WIDTH)
    const wrapper = await mountElo({
      ratings: page([ratingRow(), ratingRow({ user: { id: 'user-2', nickname: 'Зодиак' }, position: 2 })])
    })
    const rows = wrapper.findAll('.rating-row')

    await rows[1].trigger('keydown', { key: ' ' })
    await flushPromises()
    expect(chart(wrapper).props('player')).toEqual({ id: 'user-2', nickname: 'Зодиак' })
    expect(rows[1].attributes('aria-current')).toBe('true')

    await rows[0].trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(chart(wrapper).props('player')).toEqual({ id: 'user-1', nickname: 'Барон' })
  })

  it('на телефоне под списком объясняет «новый», когда он в списке есть', async () => {
    setViewport(MOBILE_WIDTH)
    const withNewcomer = await mountElo({ ratings: page([ratingRow({ delta: null })]) })

    expect(withNewcomer.find('.list-note').text())
      .toBe('«новый» — неделю назад игрок ещё не прошёл калибровку')

    const withoutNewcomer = await mountElo({ ratings: page([ratingRow({ delta: 3 })]) })
    expect(withoutNewcomer.find('.list-note').exists()).toBe(false)
  })
})
