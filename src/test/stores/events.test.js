// Тесты для store управления событиями

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEventsStore } from '@/stores/events'
import { createMockApiService, mockData } from '../utils.js'

// Мокаем API сервис
vi.mock('@/services/api', () => ({
  apiService: createMockApiService()
}))

describe('Events Store', () => {
  let store
  let mockApi

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useEventsStore()
    mockApi = createMockApiService({
      getEvents: vi.fn().mockResolvedValue(mockData.events),
      getEvent: vi.fn().mockResolvedValue(mockData.event),
      createEvent: vi.fn().mockResolvedValue({ id: 3, ...mockData.event }),
      updateEvent: vi.fn().mockResolvedValue(mockData.event),
      deleteEvent: vi.fn().mockResolvedValue({})
    })
    vi.clearAllMocks()
  })

  describe('Инициализация', () => {
    it('должен иметь корректное начальное состояние', () => {
      expect(store.events).toEqual([])
      expect(store.currentEvent).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('Загрузка событий', () => {
    it('должен загрузить все события', async () => {
      store.$api = mockApi

      await store.fetchEvents()

      expect(mockApi.getEvents).toHaveBeenCalled()
      expect(store.events).toEqual(mockData.events)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('должен установить состояние loading при загрузке', async () => {
      store.$api = mockApi
      
      // Создаем промис, который можем контролировать
      let resolvePromise
      const controlledPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockApi.getEvents = vi.fn().mockReturnValue(controlledPromise)

      const fetchPromise = store.fetchEvents()
      
      // Проверяем состояние loading
      expect(store.loading).toBe(true)

      resolvePromise(mockData.events)
      await fetchPromise

      expect(store.loading).toBe(false)
    })

    it('должен обработать ошибку при загрузке событий', async () => {
      const error = new Error('API Error')
      mockApi.getEvents = vi.fn().mockRejectedValue(error)
      store.$api = mockApi

      await store.fetchEvents()

      expect(store.error).toBe(error.message)
      expect(store.loading).toBe(false)
      expect(store.events).toEqual([])
    })
  })

  describe('Загрузка отдельного события', () => {
    it('должен загрузить событие по ID', async () => {
      store.$api = mockApi

      await store.fetchEvent(1)

      expect(mockApi.getEvent).toHaveBeenCalledWith(1)
      expect(store.currentEvent).toEqual(mockData.event)
    })

    it('должен обработать ошибку при загрузке события', async () => {
      const error = new Error('Event not found')
      mockApi.getEvent = vi.fn().mockRejectedValue(error)
      store.$api = mockApi

      await store.fetchEvent(999)

      expect(store.error).toBe(error.message)
      expect(store.currentEvent).toBeNull()
    })
  })

  describe('Создание события', () => {
    it('должен создать новое событие', async () => {
      store.$api = mockApi
      const newEventData = {
        label: 'Новое мероприятие',
        description: 'Описание',
        start_date: '2024-02-01'
      }

      const result = await store.createEvent(newEventData)

      expect(mockApi.createEvent).toHaveBeenCalledWith(newEventData)
      expect(result).toEqual({ id: 3, ...mockData.event })
    })

    it('должен добавить созданное событие в список', async () => {
      store.events = [...mockData.events] // Инициализируем текущие события
      store.$api = mockApi

      const newEventData = { label: 'Новое мероприятие' }
      await store.createEvent(newEventData)

      expect(store.events).toHaveLength(3)
      expect(store.events[2].id).toBe(3)
    })

    it('должен обработать ошибку при создании события', async () => {
      const error = new Error('Validation Error')
      mockApi.createEvent = vi.fn().mockRejectedValue(error)
      store.$api = mockApi

      await expect(store.createEvent({})).rejects.toThrow('Validation Error')
      expect(store.error).toBe(error.message)
    })
  })

  describe('Обновление события', () => {
    beforeEach(() => {
      store.events = [...mockData.events]
    })

    it('должен обновить событие', async () => {
      store.$api = mockApi
      const updatedData = {
        label: 'Обновленное название',
        description: 'Новое описание'
      }

      const result = await store.updateEvent(1, updatedData)

      expect(mockApi.updateEvent).toHaveBeenCalledWith(1, updatedData)
      expect(result).toEqual(mockData.event)
    })

    it('должен обновить событие в списке', async () => {
      store.$api = mockApi
      const updatedData = { label: 'Обновленное название' }

      await store.updateEvent(1, updatedData)

      const updatedEvent = store.events.find(event => event.id === 1)
      expect(updatedEvent.label).toBe('Обновленное название')
    })

    it('должен обновить currentEvent если оно обновляется', async () => {
      store.currentEvent = { ...mockData.event }
      store.$api = mockApi
      
      const updatedData = { label: 'Обновленное название' }
      await store.updateEvent(1, updatedData)

      expect(store.currentEvent.label).toBe('Обновленное название')
    })

    it('должен обработать ошибку при обновлении события', async () => {
      const error = new Error('Update Error')
      mockApi.updateEvent = vi.fn().mockRejectedValue(error)
      store.$api = mockApi

      await expect(store.updateEvent(1, {})).rejects.toThrow('Update Error')
      expect(store.error).toBe(error.message)
    })
  })

  describe('Удаление события', () => {
    beforeEach(() => {
      store.events = [...mockData.events]
    })

    it('должен удалить событие', async () => {
      store.$api = mockApi

      await store.deleteEvent(1)

      expect(mockApi.deleteEvent).toHaveBeenCalledWith(1)
    })

    it('должен удалить событие из списка', async () => {
      store.$api = mockApi
      const initialCount = store.events.length

      await store.deleteEvent(1)

      expect(store.events).toHaveLength(initialCount - 1)
      expect(store.events.find(event => event.id === 1)).toBeUndefined()
    })

    it('должен очистить currentEvent если оно удаляется', async () => {
      store.currentEvent = { ...mockData.event }
      store.$api = mockApi

      await store.deleteEvent(1)

      expect(store.currentEvent).toBeNull()
    })

    it('должен обработать ошибку при удалении события', async () => {
      const error = new Error('Delete Error')
      mockApi.deleteEvent = vi.fn().mockRejectedValue(error)
      store.$api = mockApi

      await expect(store.deleteEvent(1)).rejects.toThrow('Delete Error')
      expect(store.error).toBe(error.message)
    })
  })

  describe('Геттеры', () => {
    beforeEach(() => {
      store.events = [...mockData.events]
    })

    it('должен фильтровать активные события', () => {
      const activeEvents = store.activeEvents
      expect(activeEvents).toHaveLength(1)
      expect(activeEvents[0].status).toBe('active')
    })

    it('должен фильтровать завершенные события', () => {
      const completedEvents = store.completedEvents
      expect(completedEvents).toHaveLength(1)
      expect(completedEvents[0].status).toBe('completed')
    })

    it('должен сортировать события по дате', () => {
      const sortedEvents = store.eventsByDate
      expect(sortedEvents[0].start_date).toBe('2024-01-15')
      expect(sortedEvents[1].start_date).toBe('2024-01-20')
    })

    it('должен найти событие по ID', () => {
      const event = store.getEventById(1)
      expect(event).toEqual(mockData.events[0])
    })

    it('должен вернуть null для несуществующего ID', () => {
      const event = store.getEventById(999)
      expect(event).toBeNull()
    })
  })

  describe('Поиск и фильтрация', () => {
    beforeEach(() => {
      store.events = [
        { id: 1, label: 'Турнир по мафии', status: 'active', start_date: '2024-01-15' },
        { id: 2, label: 'Чемпионат города', status: 'completed', start_date: '2024-01-20' },
        { id: 3, label: 'Кубок новичков', status: 'active', start_date: '2024-01-25' }
      ]
    })

    it('должен искать события по названию', () => {
      const results = store.searchEvents('турнир')
      expect(results).toHaveLength(1)
      expect(results[0].label).toContain('Турнир')
    })

    it('должен искать события без учета регистра', () => {
      const results = store.searchEvents('ТУРНИР')
      expect(results).toHaveLength(1)
    })

    it('должен фильтровать по статусу', () => {
      const activeEvents = store.filterEventsByStatus('active')
      expect(activeEvents).toHaveLength(2)
      expect(activeEvents.every(event => event.status === 'active')).toBe(true)
    })

    it('должен фильтровать по диапазону дат', () => {
      const eventsInRange = store.filterEventsByDateRange('2024-01-15', '2024-01-20')
      expect(eventsInRange).toHaveLength(2)
    })
  })

  describe('Очистка состояния', () => {
    it('должен очистить ошибки', () => {
      store.error = 'Test error'
      store.clearError()
      expect(store.error).toBeNull()
    })

    it('должен сбросить состояние', () => {
      store.events = [...mockData.events]
      store.currentEvent = mockData.event
      store.error = 'Error'
      store.loading = true

      store.reset()

      expect(store.events).toEqual([])
      expect(store.currentEvent).toBeNull()
      expect(store.error).toBeNull()
      expect(store.loading).toBe(false)
    })

    it('должен очистить текущее событие', () => {
      store.currentEvent = mockData.event
      store.clearCurrentEvent()
      expect(store.currentEvent).toBeNull()
    })
  })
})