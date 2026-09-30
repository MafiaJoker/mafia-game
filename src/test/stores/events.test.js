// Стор мероприятий держит страницу списка такой, какой её отдал сервер: ответ
// любой из известных форм разворачивается, сбой загрузки не оставляет старую
// страницу, а неудачное удаление отвечает false вместо исключения

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEventsStore } from '@/stores/events'
import { apiService } from '@/services/api.js'

vi.mock('@/services/api.js', () => ({
  apiService: {
    getEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    getEventTypes: vi.fn()
  }
}))

const cup = { id: 'ev-1', label: 'Кубок осени' }
const league = { id: 'ev-2', label: 'Лига четверга' }

const serverTypes = [{ id: 'type-1', label: 'Рейтинговая игра' }]

// Типы, которые стор подставляет, когда сервер своих не отдал
const FALLBACK_TYPES = [
  { id: 'tournament', label: 'Турнир' },
  { id: 'training', label: 'Тренировка' },
  { id: 'special', label: 'Специальное' }
]

let store

// Стор пишет в консоль каждую загрузку и каждую ошибку: в выводе тестов это шум
beforeAll(() => {
  for (const level of ['log', 'warn', 'error']) {
    vi.spyOn(console, level).mockImplementation(() => {})
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  store = useEventsStore()
  apiService.getEvents.mockResolvedValue({ items: [], total: 0 })
})

describe('useEventsStore: загрузка страницы мероприятий', () => {
  it('шлёт страницу, размер и все фильтры, обрезая пробелы в поиске', async () => {
    await store.loadEvents(2, 50, '  Кубок  ', 'active', 'type-1', ['2026-09-01', '2026-09-30'])

    expect(apiService.getEvents).toHaveBeenCalledWith({
      pageSize: 50,
      currentPage: 2,
      searchString: 'Кубок',
      status: 'active',
      event_type_id: 'type-1',
      start_date_from: '2026-09-01',
      start_date_to: '2026-09-30'
    })
  })

  it('пустые фильтры не шлёт: уходят только страница и размер', async () => {
    await store.loadEvents()
    // Поиск из одних пробелов и диапазон без второй даты — тоже пустые
    await store.loadEvents(1, 20, '   ', '', '', ['2026-09-01'])

    expect(apiService.getEvents.mock.calls).toEqual([
      [{ pageSize: 20, currentPage: 1 }],
      [{ pageSize: 20, currentPage: 1 }]
    ])
  })

  it.each([
    ['{ items, total }', { items: [cup, league], total: 42 }, 42],
    ['{ data, total }', { data: [cup, league], total: 42 }, 42],
    ['{ events } без total', { events: [cup, league] }, 2]
  ])('ответ %s разворачивает в список и счётчик', async (shape, answer, total) => {
    apiService.getEvents.mockResolvedValue(answer)

    await store.loadEvents()

    expect(store.events).toEqual([cup, league])
    expect(store.serverTotalEvents).toBe(total)
  })

  it('голый массив кладёт в список как есть', async () => {
    apiService.getEvents.mockResolvedValue([cup, league])

    await store.loadEvents()

    expect(store.events).toEqual([cup, league])
  })

  it('непонятный ответ очищает список и счётчик, а не оставляет прошлую страницу', async () => {
    apiService.getEvents.mockResolvedValueOnce({ items: [cup], total: 21 })
    await store.loadEvents()

    apiService.getEvents.mockResolvedValueOnce({ results: [league] })
    await store.loadEvents(2)

    expect(store.events).toEqual([])
    expect(store.serverTotalEvents).toBe(0)
  })

  // Так отвечает фронт, если адрес API смотрит не на бекенд
  it('HTML-страница вместо JSON не попадает в список', async () => {
    apiService.getEvents.mockResolvedValueOnce({ items: [cup], total: 1 })
    await store.loadEvents()

    apiService.getEvents.mockResolvedValueOnce('<!DOCTYPE html><html><body></body></html>')
    await store.loadEvents()

    expect(store.events).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('держит loading, пока сервер отвечает', async () => {
    let answer
    apiService.getEvents.mockReturnValue(new Promise(resolve => { answer = resolve }))

    const loading = store.loadEvents()
    expect(store.loading).toBe(true)

    answer({ items: [cup], total: 1 })
    await loading

    expect(store.loading).toBe(false)
  })

  it('ошибка загрузки очищает список и счётчик и уходит вызывающему', async () => {
    apiService.getEvents.mockResolvedValueOnce({ items: [cup, league], total: 2 })
    await store.loadEvents()

    const failure = new Error('Network Error')
    apiService.getEvents.mockRejectedValueOnce(failure)

    await expect(store.loadEvents(2)).rejects.toBe(failure)
    expect(store.events).toEqual([])
    expect(store.serverTotalEvents).toBe(0)
    expect(store.loading).toBe(false)
  })

  it('getEventById ищет мероприятие на загруженной странице', async () => {
    apiService.getEvents.mockResolvedValue({ items: [cup, league], total: 2 })
    await store.loadEvents()

    expect(store.getEventById('ev-2')).toEqual(league)
    expect(store.getEventById('ev-404')).toBeUndefined()
  })
})

describe('useEventsStore: создание, правка и удаление', () => {
  it('createEvent создаёт мероприятие и перечитывает список с сервера', async () => {
    apiService.createEvent.mockResolvedValue(cup)
    apiService.getEvents.mockResolvedValue({ items: [cup, league], total: 2 })

    await expect(store.createEvent({ label: 'Кубок осени' })).resolves.toEqual(cup)

    expect(apiService.createEvent).toHaveBeenCalledWith({ label: 'Кубок осени' })
    expect(apiService.getEvents).toHaveBeenCalledTimes(1)
    expect(store.events).toEqual([cup, league])
  })

  // Стор ждёт мероприятие в ответе, а бек на PATCH /events/{id} отвечает 204
  // без тела - тогда в список ляжет пустая строка
  it('updateEvent заменяет мероприятие в списке ответом сервера', async () => {
    store.events = [cup, league]
    const renamed = { ...league, label: 'Лига пятницы' }
    apiService.updateEvent.mockResolvedValue(renamed)

    await expect(store.updateEvent('ev-2', { label: 'Лига пятницы' })).resolves.toEqual(renamed)

    expect(apiService.updateEvent).toHaveBeenCalledWith('ev-2', { label: 'Лига пятницы' })
    expect(store.events).toEqual([cup, renamed])
  })

  it('deleteEvent убирает мероприятие из списка и отвечает true', async () => {
    store.events = [cup, league]
    apiService.deleteEvent.mockResolvedValue(undefined)

    await expect(store.deleteEvent('ev-1')).resolves.toBe(true)

    expect(apiService.deleteEvent).toHaveBeenCalledWith('ev-1')
    expect(store.events).toEqual([league])
  })

  it('deleteEvent при ошибке не бросает: отвечает false и оставляет список', async () => {
    store.events = [cup, league]
    apiService.deleteEvent.mockRejectedValue(new Error('Request failed with status code 409'))

    await expect(store.deleteEvent('ev-1')).resolves.toBe(false)

    expect(store.events).toEqual([cup, league])
  })
})

describe('useEventsStore: типы мероприятий', () => {
  it.each([
    ['массивом', serverTypes],
    ['в { items }', { items: serverTypes }],
    ['в { data }', { data: serverTypes }]
  ])('принимает типы сервера, пришедшие %s', async (shape, answer) => {
    apiService.getEventTypes.mockResolvedValue(answer)

    await store.loadEventTypes()

    expect(store.eventTypes).toEqual(serverTypes)
  })

  // Фильтр по типу на экране мероприятий не должен остаться пустым
  it.each([
    ['непонятный ответ', async () => ({ results: serverTypes })],
    ['ошибку сервера', async () => { throw new Error('Network Error') }]
  ])('на %s подставляет три статичных типа, не бросая', async (reason, answer) => {
    apiService.getEventTypes.mockImplementation(answer)

    await store.loadEventTypes()

    expect(store.eventTypes).toEqual(FALLBACK_TYPES)
  })
})
