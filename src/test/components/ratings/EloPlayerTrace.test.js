// Карточка графика игрока: точки считает сервер, поэтому проверяем, чей след
// карточка просит и что говорит, когда рисовать нечего - игрок на калибровке,
// игр в рейтинге нет или запрос сорвался

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import EloPlayerTrace from '@/components/ratings/EloPlayerTrace.vue'
import EloTraceChart from '@/components/ratings/EloTraceChart.vue'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    getEloPlayerTrace: vi.fn()
  }
}))

const BARON = { id: 'user-1', nickname: 'Барон' }
const ZODIAC = { id: 'user-2', nickname: 'Зодиак' }

const point = (overrides = {}) => ({
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
  score: 1,
  ...overrides
})

const trace = (overrides = {}) => ({
  user: BARON,
  profile_id: 'profile-fiim',
  calibration_games_left: 0,
  points: [
    point(),
    point({ game_id: 'game-2', played_at: '2026-09-01', rating: 1009, delta: 2.9 }),
    point({ game_id: 'game-3', played_at: '2026-09-08', rating: 1012, delta: 3.1 })
  ],
  ...overrides
})

const notFound = (detail) => ({ response: { status: 404, data: { status_code: 404, detail } } })

const myChartButton = (wrapper) => wrapper.findAll('button').find((button) => button.text() === 'Мой график')

const mountTrace = async (props = {}) => {
  const wrapper = mount(EloPlayerTrace, {
    props: { profileId: 'profile-fiim', player: BARON, isMe: false, ...props }
  })
  await flushPromises()
  return wrapper
}

// Обёртки прошлых тестов не должны жить дальше: ширина экрана у всех общая,
// и её смена перерисовывала бы каждую, растягивая тест на секунды
enableAutoUnmount(afterEach)

describe('EloPlayerTrace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiService.getEloPlayerTrace.mockResolvedValue(trace())
  })

  it('просит след игрока по выбранному профилю', async () => {
    await mountTrace()

    expect(apiService.getEloPlayerTrace).toHaveBeenCalledWith('user-1', { profile_id: 'profile-fiim' })
  })

  it('над графиком - рейтинг после последней игры и число игр', async () => {
    const wrapper = await mountTrace()
    const stats = wrapper.findAll('.trace-stat').map((stat) => stat.text())

    expect(stats).toEqual(['Рейтинг1012', 'Игр3'])
    expect(wrapper.findComponent(EloTraceChart).props('points')).toHaveLength(3)
    expect(wrapper.text()).toContain('Последняя игра — 8 сентября 2026 г.')
  })

  it('свой график подписан «вы» и подсказывает, как открыть чужой', async () => {
    const wrapper = await mountTrace({ isMe: true })

    expect(wrapper.find('.trace-player').text()).toContain('вы')
    expect(wrapper.text()).toContain('Нажмите на игрока в списке')
    expect(wrapper.text()).not.toContain('Мой график')
  })

  it('с чужого графика можно вернуться к своему, и фокус не теряется', async () => {
    const wrapper = mount(EloPlayerTrace, {
      props: { profileId: 'profile-fiim', player: BARON, isMe: false, canShowMine: true },
      attachTo: document.body
    })
    await flushPromises()
    const back = myChartButton(wrapper)

    back.element.focus()
    await back.trigger('click')
    // родитель в ответ открывает свой график - кнопка пропадает
    await wrapper.setProps({ player: ZODIAC, isMe: true, canShowMine: false })
    await flushPromises()

    expect(wrapper.emitted('reset')).toHaveLength(1)
    expect(myChartButton(wrapper)).toBeUndefined()
    expect(document.activeElement).toBe(wrapper.find('.card-title').element)
  })

  it('своего графика нет - на чужом нет и кнопки «Мой график»', async () => {
    const wrapper = await mountTrace({ canShowMine: false })

    expect(myChartButton(wrapper)).toBeUndefined()
  })

  it('подсказка к графику - кнопка, до неё доходят с клавиатуры', async () => {
    const wrapper = await mountTrace()
    const hint = wrapper.find('.trace-title button.hint-icon')

    expect(hint.exists()).toBe(true)
    expect(hint.attributes('aria-label')).toBe('Как читать график')
  })

  it('игрок на калибровке: вместо графика - сколько игр ему осталось', async () => {
    apiService.getEloPlayerTrace.mockResolvedValue(trace({ calibration_games_left: 3, points: [] }))
    const wrapper = await mountTrace()

    expect(wrapper.findComponent(EloTraceChart).exists()).toBe(false)
    expect(wrapper.text()).toContain('Игрок на калибровке: до места в таблице ему осталось сыграть 3 игры')
  })

  it('сам на калибровке - говорит это от второго лица', async () => {
    apiService.getEloPlayerTrace.mockResolvedValue(trace({ calibration_games_left: 1, points: [] }))
    const wrapper = await mountTrace({ isMe: true })

    expect(wrapper.text()).toContain('Вы на калибровке: до места в таблице осталось сыграть 1 игру')
  })

  it('число игр до конца калибровки - в винительном падеже', async () => {
    apiService.getEloPlayerTrace.mockResolvedValue(trace({ calibration_games_left: 21, points: [] }))
    const wrapper = await mountTrace()

    expect(wrapper.text()).toContain('ему осталось сыграть 21 игру')
  })

  it('игр в этом рейтинге нет - так и говорит, а не показывает ошибку', async () => {
    apiService.getEloPlayerTrace.mockRejectedValue(notFound('elo player not found'))
    const wrapper = await mountTrace({ isMe: true })

    expect(wrapper.text()).toContain('У вас пока нет игр в этом рейтинге')
    expect(wrapper.text()).not.toContain('Повторить')
  })

  it('профиль пропал, пока страница открыта, - просит обновить её', async () => {
    apiService.getEloPlayerTrace.mockRejectedValue(notFound('elo profile not found'))
    const wrapper = await mountTrace()

    expect(wrapper.text()).toContain('Профиль рейтинга не найден. Обновите страницу')
    expect(wrapper.text()).not.toContain('Игр для графика пока нет')
  })

  it('запрос сорвался - предлагает повторить', async () => {
    apiService.getEloPlayerTrace.mockRejectedValueOnce(new Error('Network Error'))
    const wrapper = await mountTrace()

    expect(wrapper.text()).toContain('Не удалось загрузить график')
    const retry = wrapper.findAll('button').find((button) => button.text() === 'Повторить')
    await retry.trigger('click')
    await flushPromises()

    expect(apiService.getEloPlayerTrace).toHaveBeenCalledTimes(2)
    expect(wrapper.findComponent(EloTraceChart).exists()).toBe(true)
  })

  it('другой игрок или профиль - след запрашивается заново', async () => {
    const wrapper = await mountTrace()

    await wrapper.setProps({ player: ZODIAC })
    await flushPromises()
    expect(apiService.getEloPlayerTrace).toHaveBeenLastCalledWith('user-2', { profile_id: 'profile-fiim' })

    await wrapper.setProps({ profileId: 'profile-imafia' })
    await flushPromises()
    expect(apiService.getEloPlayerTrace).toHaveBeenLastCalledWith('user-2', { profile_id: 'profile-imafia' })
  })

  it('тот же игрок новым объектом - след заново не грузится', async () => {
    const wrapper = await mountTrace()

    await wrapper.setProps({ player: { ...BARON } })
    await flushPromises()

    expect(apiService.getEloPlayerTrace).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.trace-body').classes()).not.toContain('is-refreshing')
  })

  it('ответ по прошлому игроку не перетирает график нового', async () => {
    let resolveBaron
    apiService.getEloPlayerTrace
      .mockImplementationOnce(() => new Promise((resolve) => { resolveBaron = resolve }))
      .mockResolvedValueOnce(trace({ user: ZODIAC, points: [point({ rating: 1100 })] }))
    const wrapper = mount(EloPlayerTrace, {
      props: { profileId: 'profile-fiim', player: BARON, isMe: false }
    })

    await wrapper.setProps({ player: ZODIAC })
    await flushPromises()
    resolveBaron(trace())
    await flushPromises()

    expect(wrapper.find('.trace-stat').text()).toContain('1100')
  })

  it('смотреть некого - просит выбрать игрока и ничего не запрашивает', async () => {
    const wrapper = await mountTrace({ player: null })

    expect(apiService.getEloPlayerTrace).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Выберите игрока в списке')
  })
})
