// График рейтинга игрока: проверяем то, что читатель видит и трогает, -
// шкалу со стартовым рейтингом, полосы игровых дней с датами и подсказку по
// наведению, тапу и клавишам

import { describe, it, expect, afterEach } from 'vitest'
import { mount, enableAutoUnmount } from '@vue/test-utils'
import EloTraceChart from '@/components/ratings/EloTraceChart.vue'

// Ширина по умолчанию, пока ResizeObserver молчит, и поля графика
const WIDTH = 600
const MARGIN_LEFT = 44
const MARGIN_RIGHT = 48
const PLOT_WIDTH = WIDTH - MARGIN_LEFT - MARGIN_RIGHT

// Изменение за игру по умолчанию - шесть очков: первая точка тогда стоит на
// 1006 после старта с 1000
const point = (played_at, rating, delta = 6) => ({
  game_id: `game-${played_at}-${rating}`,
  played_at,
  rating,
  delta
})

// Два игровых дня: три игры 1 сентября и две 8 сентября, старт - 1000
const POINTS = [
  point('2026-09-01', 1006, 6.3),
  point('2026-09-01', 1012, 5.8),
  point('2026-09-01', 1004, -7.9),
  point('2026-09-08', 1015, 11.2),
  point('2026-09-08', 1021, 5.6)
]

const mountChart = (points = POINTS) => mount(EloTraceChart, { props: { points } })

// У каждой игры своя ячейка, точка - в её середине
const slotOf = (count) => PLOT_WIDTH / count
const clientXOf = (index, count) => MARGIN_LEFT + (index + 0.5) * slotOf(count)

const hover = (wrapper, index, pointerType = 'mouse') => wrapper.find('.hit-area').trigger('pointermove', {
  clientX: clientXOf(index, wrapper.props('points').length),
  pointerType
})

const tooltip = (wrapper) => wrapper.find('.chart-tooltip').text()
const yLabels = (wrapper) => wrapper.findAll('text.tick-label[text-anchor="end"]').map((label) => label.text())
const xLabels = (wrapper) => wrapper.findAll('text.tick-label[text-anchor="middle"]')

// График прошлого теста не должен ловить события следующего
enableAutoUnmount(afterEach)

describe('EloTraceChart', () => {
  it('линия проходит через каждую игру', () => {
    const wrapper = mountChart()
    const path = wrapper.find('path.line').attributes('d')

    expect(path.match(/[ML]/g)).toEqual(['M', 'L', 'L', 'L', 'L'])
  })

  it('шкала всегда включает стартовый рейтинг и выделяет его линию', () => {
    const wrapper = mountChart([point('2026-09-01', 1080, 80), point('2026-09-08', 1120, 40)])

    expect(yLabels(wrapper)).toContain('1000')
    expect(wrapper.findAll('.grid-line.is-start')).toHaveLength(1)
  })

  it('старт берётся из следа, а не считается равным 1000', async () => {
    // профиль со стартом 1500: первая игра +6.3
    const wrapper = mountChart([point('2026-09-01', 1506, 6.3), point('2026-09-08', 1512, 5.9)])
    const start = wrapper.find('.grid-line.is-start')

    expect(yLabels(wrapper)).toContain('1500')
    expect(yLabels(wrapper)).not.toContain('1000')
    expect(start.exists()).toBe(true)
    // линия старта - на делении 1500
    const label1500 = wrapper.findAll('text.tick-label[text-anchor="end"]').find((label) => label.text() === '1500')
    expect(start.attributes('y1')).toBe(label1500.attributes('y'))

    await hover(wrapper, 0)
    expect(wrapper.find('.tooltip-delta').text()).toBe('+6.3')
  })

  it('деления шкалы - круглые числа', () => {
    const wrapper = mountChart()

    expect(yLabels(wrapper)).toEqual(['990', '1000', '1010', '1020', '1030'])
  })

  it('игровой день - полоса на все его игры, соседние дни через одну', () => {
    const wrapper = mountChart([...POINTS, point('2026-09-15', 1030)])
    const slot = slotOf(6)
    const bands = wrapper.findAll('rect.day-band')

    // закрашены первый и третий день, второй остаётся белым
    expect(bands).toHaveLength(2)
    expect(Number(bands[0].attributes('x'))).toBeCloseTo(MARGIN_LEFT)
    expect(Number(bands[0].attributes('width'))).toBeCloseTo(3 * slot)
    expect(Number(bands[1].attributes('x'))).toBeCloseTo(MARGIN_LEFT + 5 * slot)
    expect(Number(bands[1].attributes('width'))).toBeCloseTo(slot)
  })

  it('дата подписана один раз - под серединой своего дня', () => {
    const wrapper = mountChart()
    const slot = slotOf(5)
    const labels = xLabels(wrapper)

    expect(labels.map((label) => label.text())).toEqual(['01.09', '08.09'])
    expect(Number(labels[0].attributes('x'))).toBeCloseTo(MARGIN_LEFT + 1.5 * slot)
    expect(Number(labels[1].attributes('x'))).toBeCloseTo(MARGIN_LEFT + 4 * slot)
  })

  it('день из пятнадцати игр - одна полоса и одна дата', () => {
    const marathon = Array.from({ length: 15 }, (_, index) => point('2026-09-19', 990 + index * 7))
    const wrapper = mountChart(marathon)

    expect(wrapper.findAll('rect.day-band')).toHaveLength(1)
    expect(Number(wrapper.find('rect.day-band').attributes('width'))).toBeCloseTo(PLOT_WIDTH)
    expect(xLabels(wrapper).map((label) => label.text())).toEqual(['19.09'])
    expect(wrapper.findAll('circle.dot')).toHaveLength(15)
  })

  it('подпись под графиком говорит, что значит полоса', () => {
    const wrapper = mountChart()

    expect(wrapper.find('.chart-legend').text()).toBe('Полоса — игровой день')
  })

  it('год игр по вечерам - полосы по месяцам, у смены года подписан год', () => {
    // две игры каждый третий день: от дней остались бы полосы по 4px
    const year = []
    for (let day = new Date(2025, 9, 1); day <= new Date(2026, 8, 25); day.setDate(day.getDate() + 3)) {
      const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
      year.push(point(iso, 1000), point(iso, 1004))
    }
    const wrapper = mountChart(year)
    const labels = xLabels(wrapper).map((label) => label.text())

    expect(wrapper.find('.chart-legend').text()).toBe('Полоса — месяц')
    // двенадцать месяцев, закрашен каждый второй
    expect(wrapper.findAll('rect.day-band')).toHaveLength(6)
    expect(labels[0]).toBe('окт 2025')
    expect(labels.find((label) => label.endsWith('2026'))).toMatch(/^(янв|фев) 2026$/)
    expect(labels.filter((label) => /\d{4}$/.test(label))).toHaveLength(2)
  })

  it('много лет истории - полосы по годам', () => {
    // игра в неделю восемь лет подряд: месяцы вышли бы по 5px
    const years = []
    for (let day = new Date(2018, 0, 3); day.getFullYear() < 2026; day.setDate(day.getDate() + 7)) {
      years.push(point(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`, 1000))
    }
    const wrapper = mountChart(years)

    expect(wrapper.find('.chart-legend').text()).toBe('Полоса — год')
    expect(wrapper.findAll('rect.day-band')).toHaveLength(4)
    expect(xLabels(wrapper).map((label) => label.text())).toEqual(
      ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025']
    )
  })

  it('игры разных лет подписаны с годом', () => {
    const wrapper = mountChart([point('2025-12-20', 1004), point('2026-01-10', 1010)])

    expect(xLabels(wrapper).map((label) => label.text())).toEqual(['20.12.25', '10.01.26'])
  })

  it('подписано только последнее значение, остальные - в подсказке', () => {
    const wrapper = mountChart()

    expect(wrapper.find('.end-label').text()).toBe('1021')
  })

  it('наведение показывает рейтинг, изменение за игру, дату и номер игры в этом дне', async () => {
    const wrapper = mountChart()

    await hover(wrapper, 2)

    expect(tooltip(wrapper)).toContain('1004')
    expect(tooltip(wrapper)).toContain('−7.9')
    expect(tooltip(wrapper)).toContain('1 сент. 2026 г.')
    expect(tooltip(wrapper)).toContain('игра 3 из 3 за день')
    expect(wrapper.find('.crosshair').exists()).toBe(true)
  })

  it('единственная игра дня - без номера в дне', async () => {
    const wrapper = mountChart([point('2026-09-01', 1006), point('2026-09-08', 1012)])

    await hover(wrapper, 1)

    expect(tooltip(wrapper)).toContain('8 сент. 2026 г.')
    expect(tooltip(wrapper)).not.toContain('из')
  })

  it('изменение за игру - из следа: округление точек его не съедает', async () => {
    // 1006.3 -> 1006.7: на графике обе точки 1006 и 1007, но игра дала +0.4
    const wrapper = mountChart([point('2026-09-01', 1006, 6.3), point('2026-09-01', 1007, 0.4)])

    await hover(wrapper, 0)
    expect(tooltip(wrapper)).toContain('+6.3')

    await hover(wrapper, 1)
    expect(tooltip(wrapper)).toContain('+0.4')
  })

  it('игра без изменения - «±0»', async () => {
    const wrapper = mountChart([point('2026-09-01', 1006, 6.3), point('2026-09-01', 1006, 0.02)])

    await hover(wrapper, 1)

    expect(tooltip(wrapper)).toContain('±0')
  })

  it('мышь ушла - подсказка прячется, палец отпустили - остаётся', async () => {
    const wrapper = mountChart()

    await hover(wrapper, 1)
    await wrapper.find('.hit-area').trigger('pointerleave', { pointerType: 'mouse' })
    expect(wrapper.find('.chart-tooltip').exists()).toBe(false)

    await hover(wrapper, 1, 'touch')
    await wrapper.find('.hit-area').trigger('pointerleave', { pointerType: 'touch' })
    expect(wrapper.find('.chart-tooltip').exists()).toBe(true)
  })

  it('вертикальный свайп с графика: браузер забирает касание - подсказка уходит', async () => {
    const wrapper = mountChart()

    await wrapper.find('.hit-area').trigger('pointerdown', {
      clientX: clientXOf(1, POINTS.length),
      pointerType: 'touch'
    })
    expect(wrapper.find('.chart-tooltip').exists()).toBe(true)

    await wrapper.find('.hit-area').trigger('pointercancel', { pointerType: 'touch' })
    expect(wrapper.find('.chart-tooltip').exists()).toBe(false)
    expect(wrapper.find('.crosshair').exists()).toBe(false)
  })

  it('с клавиатуры: фокус встаёт на последнюю игру, стрелки листают', async () => {
    // фокус настоящий - в документе: подсказку открывает только видимый фокус
    const wrapper = mount(EloTraceChart, { props: { points: POINTS }, attachTo: document.body })

    wrapper.element.focus()
    await wrapper.vm.$nextTick()
    expect(tooltip(wrapper)).toContain('1021')
    expect(tooltip(wrapper)).toContain('игра 2 из 2 за день')

    await wrapper.trigger('keydown', { key: 'ArrowLeft' })
    expect(tooltip(wrapper)).toContain('1015')

    await wrapper.trigger('keydown', { key: 'Home' })
    expect(tooltip(wrapper)).toContain('1006')
    expect(tooltip(wrapper)).toContain('игра 1 из 3 за день')

    await wrapper.trigger('keydown', { key: 'ArrowLeft' })
    expect(tooltip(wrapper)).toContain('1006')

    await wrapper.trigger('blur')
    expect(wrapper.find('.chart-tooltip').exists()).toBe(false)
  })

  it('фокус от клика мышью мимо линии подсказку не открывает', async () => {
    const wrapper = mountChart()

    // событие фокуса без видимого фокуса - так приходит клик по легенде или оси
    await wrapper.trigger('focus')

    expect(wrapper.find('.chart-tooltip').exists()).toBe(false)
  })

  it('экранному диктору график - ползунок по играм со сводкой в описании', async () => {
    const wrapper = mountChart()
    const root = wrapper.element

    expect(root.getAttribute('role')).toBe('slider')
    expect(root.getAttribute('aria-valuemin')).toBe('1')
    expect(root.getAttribute('aria-valuemax')).toBe('5')
    // без выбора ползунок стоит на последней игре
    expect(root.getAttribute('aria-valuenow')).toBe('5')
    expect(root.getAttribute('aria-valuetext')).toBe('8 сент. 2026 г., игра 2 из 2 за день: рейтинг 1021, +5.6')

    const summary = document.getElementById(root.getAttribute('aria-describedby'))
      ?? wrapper.find(`#${CSS.escape(root.getAttribute('aria-describedby'))}`).element
    expect(summary.textContent).toBe(
      '5 игр за 2 дня, от 1004 до 1021, после последней игры 1021. Стрелки влево и вправо листают игры'
    )

    await wrapper.trigger('keydown', { key: 'Home' })
    expect(root.getAttribute('aria-valuenow')).toBe('1')
    expect(root.getAttribute('aria-valuetext')).toBe('1 сент. 2026 г., игра 1 из 3 за день: рейтинг 1006, +6.3')
  })

  it('новый след сбрасывает подсказку прошлого игрока', async () => {
    const wrapper = mountChart()

    await hover(wrapper, 1)
    await wrapper.setProps({ points: [point('2026-09-15', 990)] })

    expect(wrapper.find('.chart-tooltip').exists()).toBe(false)
  })

  it('одна игра - точка посередине, без линии в никуда', () => {
    const wrapper = mountChart([point('2026-09-15', 1003)])
    const dots = wrapper.findAll('circle.dot')

    expect(dots).toHaveLength(1)
    expect(Number(dots[0].attributes('cx'))).toBeCloseTo(MARGIN_LEFT + PLOT_WIDTH / 2)
  })
})
