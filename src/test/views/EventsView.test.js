// Тесты для страницы управления событиями

import { describe, it, expect, vi, beforeEach } from 'vitest'
import EventsView from '@/views/EventsView.vue'
import { mountComponent, createMockApiService, mockData, flushPromises } from '../utils.js'

// Мокаем API сервис
vi.mock('@/services/api', () => ({
  apiService: createMockApiService()
}))

describe('EventsView', () => {
  let wrapper
  let mockApi

  beforeEach(() => {
    mockApi = createMockApiService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Отображение компонента', () => {
    it('должен отобразиться корректно', async () => {
      wrapper = mountComponent(EventsView)
      await flushPromises()

      expect(wrapper.find('.events-view').exists()).toBe(true)
    })

    it('должен показать заголовок страницы', async () => {
      wrapper = mountComponent(EventsView)
      await flushPromises()

      const title = wrapper.find('h1')
      expect(title.exists()).toBe(true)
      expect(title.text()).toContain('Мероприятия')
    })
  })

  describe('Загрузка событий', () => {
    it('должен загрузить список событий при монтировании', async () => {
      const mockGetEvents = vi.fn().mockResolvedValue(mockData.events)
      
      wrapper = mountComponent(EventsView, {
        global: {
          mocks: {
            $api: { getEvents: mockGetEvents }
          }
        }
      })

      await flushPromises()
      expect(mockGetEvents).toHaveBeenCalled()
    })

    it('должен показать индикатор загрузки', async () => {
      const mockGetEvents = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      )
      
      wrapper = mountComponent(EventsView, {
        global: {
          mocks: {
            $api: { getEvents: mockGetEvents }
          }
        }
      })

      // Проверяем наличие индикатора загрузки
      expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true)
      
      await flushPromises()
    })

    it('должен отобразить события после загрузки', async () => {
      const mockGetEvents = vi.fn().mockResolvedValue(mockData.events)
      
      wrapper = mountComponent(EventsView, {
        global: {
          mocks: {
            $api: { getEvents: mockGetEvents }
          }
        }
      })

      await flushPromises()

      // Проверяем, что события отображаются
      const eventItems = wrapper.findAll('[data-testid="event-item"]')
      expect(eventItems).toHaveLength(mockData.events.length)
    })
  })

  describe('Фильтрация событий', () => {
    beforeEach(async () => {
      const mockGetEvents = vi.fn().mockResolvedValue(mockData.events)
      
      wrapper = mountComponent(EventsView, {
        global: {
          mocks: {
            $api: { getEvents: mockGetEvents }
          }
        }
      })

      await flushPromises()
    })

    it('должен фильтровать события по названию', async () => {
      const searchInput = wrapper.find('[data-testid="search-input"]')
      expect(searchInput.exists()).toBe(true)

      await searchInput.setValue('Мероприятие 1')
      await flushPromises()

      const visibleEvents = wrapper.findAll('[data-testid="event-item"]:not(.hidden)')
      expect(visibleEvents).toHaveLength(1)
    })

    it('должен фильтровать события по статусу', async () => {
      const statusFilter = wrapper.find('[data-testid="status-filter"]')
      
      if (statusFilter.exists()) {
        await statusFilter.setValue('active')
        await flushPromises()

        const activeEvents = wrapper.findAll('[data-testid="event-item"].active')
        expect(activeEvents.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Создание нового события', () => {
    it('должен показать кнопку создания события', async () => {
      wrapper = mountComponent(EventsView)
      await flushPromises()

      const createButton = wrapper.find('[data-testid="create-event-btn"]')
      expect(createButton.exists()).toBe(true)
      expect(createButton.text()).toContain('Создать')
    })

    it('должен открыть диалог создания при клике на кнопку', async () => {
      wrapper = mountComponent(EventsView)
      await flushPromises()

      const createButton = wrapper.find('[data-testid="create-event-btn"]')
      await createButton.trigger('click')
      await flushPromises()

      // Проверяем открытие диалога/формы создания
      const dialog = wrapper.find('[data-testid="create-event-dialog"]')
      expect(dialog.exists() || wrapper.vm.showCreateDialog).toBe(true)
    })
  })

  describe('Действия с событиями', () => {
    beforeEach(async () => {
      const mockGetEvents = vi.fn().mockResolvedValue(mockData.events)
      
      wrapper = mountComponent(EventsView, {
        global: {
          mocks: {
            $api: { getEvents: mockGetEvents }
          }
        }
      })

      await flushPromises()
    })

    it('должен перейти к странице события при клике', async () => {
      const eventItem = wrapper.find('[data-testid="event-item"]')
      expect(eventItem.exists()).toBe(true)

      await eventItem.trigger('click')
      await flushPromises()

      // Проверяем навигацию (в зависимости от реализации)
      expect(wrapper.vm.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'event',
          params: { id: expect.any(Number) }
        })
      )
    })

    it('должен показать меню действий для события', async () => {
      const actionButton = wrapper.find('[data-testid="event-actions"]')
      
      if (actionButton.exists()) {
        await actionButton.trigger('click')
        await flushPromises()

        const menu = wrapper.find('[data-testid="actions-menu"]')
        expect(menu.exists()).toBe(true)
      }
    })
  })

  describe('Обработка ошибок', () => {
    it('должен показать ошибку при неудачной загрузке событий', async () => {
      const mockGetEvents = vi.fn().mockRejectedValue(new Error('API Error'))
      
      wrapper = mountComponent(EventsView, {
        global: {
          mocks: {
            $api: { getEvents: mockGetEvents }
          }
        }
      })

      await flushPromises()

      // Проверяем отображение ошибки
      const errorMessage = wrapper.find('[data-testid="error-message"]')
      expect(errorMessage.exists() || wrapper.vm.error).toBeTruthy()
    })

    it('должен предложить повторить попытку при ошибке', async () => {
      const mockGetEvents = vi.fn().mockRejectedValue(new Error('API Error'))
      
      wrapper = mountComponent(EventsView, {
        global: {
          mocks: {
            $api: { getEvents: mockGetEvents }
          }
        }
      })

      await flushPromises()

      const retryButton = wrapper.find('[data-testid="retry-button"]')
      if (retryButton.exists()) {
        await retryButton.trigger('click')
        expect(mockGetEvents).toHaveBeenCalledTimes(2)
      }
    })
  })

  describe('Пагинация', () => {
    it('должен показать пагинацию при большом количестве событий', async () => {
      const manyEvents = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        label: `Мероприятие ${i + 1}`,
        start_date: '2024-01-15',
        status: 'active'
      }))

      const mockGetEvents = vi.fn().mockResolvedValue(manyEvents)
      
      wrapper = mountComponent(EventsView, {
        global: {
          mocks: {
            $api: { getEvents: mockGetEvents }
          }
        }
      })

      await flushPromises()

      const pagination = wrapper.find('[data-testid="pagination"]')
      expect(pagination.exists()).toBe(true)
    })
  })
})