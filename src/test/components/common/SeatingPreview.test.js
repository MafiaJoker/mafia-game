// Превью рассадки - общее у диалога мероприятия и публичной страницы:
// игры от сервера раскладываются по столам, места - по боксам.
// На телефоне вместо широкой таблицы «место x игра» - карточки игр

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, enableAutoUnmount } from '@vue/test-utils'
import SeatingPreview from '@/components/common/SeatingPreview.vue'

const DESKTOP_WIDTH = window.innerWidth

const seat = (boxId, nickname) => ({ box_id: boxId, nickname })

// Игры двух столов вперемешку, места - не по порядку боксов, а у второй
// игры первого стола нет бокса 2: так сервер не отвечает, но превью не
// должно сдвигать игроков на чужие места
const games = () => [
  { label: 'Игра 2', table_id: 2, seats: [seat(1, 'Вера'), seat(2, 'Глеб')] },
  { label: 'Игра 1', table_id: 1, seats: [seat(2, 'Борис'), seat(1, 'Алиса')] },
  { label: 'Игра 3', table_id: 1, seats: [seat(1, 'Борис'), seat(3, 'Алиса')] }
]

const mountPreview = (props = {}) => mount(SeatingPreview, {
  props: { games: games(), ...props }
})

const tableNames = (wrapper) => wrapper.findAll('.preview-table-name').map(name => name.text())

const rowCells = (table, rowIndex) => table.findAll('tbody tr')[rowIndex]
  .findAll('td')
  .map(cell => cell.text())

// Ширина экрана у всех оберток общая: без автоотмонтирования ее смена
// перерисовывала бы превью прошлых тестов
enableAutoUnmount(afterEach)

describe('SeatingPreview', () => {
  it('раскладывает игры по столам в порядке номеров', () => {
    const wrapper = mountPreview()

    expect(tableNames(wrapper)).toEqual(['Стол 1', 'Стол 2'])
    expect(wrapper.findAll('.seating-table')[0].findAll('th').map(cell => cell.text()))
      .toEqual(['Место', 'Игра 1', 'Игра 3'])
  })

  it('строка таблицы - бокс: игроки на своих местах, пропуск остается пустым', () => {
    const wrapper = mountPreview()
    const firstTable = wrapper.findAll('.seating-table')[0]

    expect(firstTable.findAll('tbody tr')).toHaveLength(10)
    expect(rowCells(firstTable, 0)).toEqual(['1', 'Алиса', 'Борис'])
    expect(rowCells(firstTable, 1)).toEqual(['2', 'Борис', ''])
    expect(rowCells(firstTable, 2)).toEqual(['3', '', 'Алиса'])
  })

  it('называет столы шаблоном мероприятия, а без «{}» в шаблоне - по умолчанию', () => {
    expect(tableNames(mountPreview({ tableNameTemplate: 'Зал {}' })))
      .toEqual(['Зал 1', 'Зал 2'])
    expect(tableNames(mountPreview({ tableNameTemplate: 'Без номера' })))
      .toEqual(['Стол 1', 'Стол 2'])
  })

  it('показывает заголовок и сид, а без сида - только заголовок', () => {
    const wrapper = mountPreview({ title: 'Клуб X, отбор', seed: 'abc' })

    expect(wrapper.find('.preview-title').text()).toBe('Клуб X, отбор')
    expect(wrapper.find('.preview-seed').text()).toBe('Сид: abc')

    const noSeed = mountPreview()
    expect(noSeed.find('.preview-title').text()).toBe('Рассадка')
    expect(noSeed.find('.preview-seed').exists()).toBe(false)
  })
})

describe('SeatingPreview на телефоне', () => {
  beforeEach(() => {
    window.innerWidth = 375
  })

  afterEach(() => {
    window.innerWidth = DESKTOP_WIDTH
  })

  it('вместо таблицы - карточка на каждую игру с местами по боксам', async () => {
    const wrapper = mountPreview()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.seating-table').exists()).toBe(false)
    expect(tableNames(wrapper)).toEqual(['Стол 1', 'Стол 2'])

    const cards = wrapper.findAll('.preview-game')
    expect(cards.map(card => card.find('.preview-game-label').text()))
      .toEqual(['Игра 1', 'Игра 3', 'Игра 2'])

    const seats = cards[1].findAll('.preview-seat')
      .map(row => `${row.find('.seat-number').text()}. ${row.find('.seat-nickname').text()}`)
    expect(seats).toHaveLength(10)
    expect(seats.slice(0, 3)).toEqual(['1. Борис', '2. ', '3. Алиса'])
  })
})
