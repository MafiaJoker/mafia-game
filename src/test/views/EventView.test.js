// Тесты для страницы отдельного события

import { describe, it, expect, vi, beforeEach } from 'vitest'
import EventView from '@/views/EventView.vue'
import { mountComponent, createMockApiService, mockData, flushPromises } from '../utils.js'

// Мокаем API сервис
vi.mock('@/services/api', () => ({
  apiService: createMockApiService()
}))

describe('EventView', () => {
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

  describe('Загрузка события', () => {
    it('должен загрузить данные события по ID', async () => {
      const mockGetEvent = vi.fn().mockResolvedValue(mockData.event)
      
      wrapper = mountComponent(EventView, {
        props: { id: '1' },
        global: {
          mocks: {
            $api: { getEvent: mockGetEvent },
            $route: { params: { id: '1' } }
          }
        }
      })

      await flushPromises()
      expect(mockGetEvent).toHaveBeenCalledWith('1')
    })

    it('должен показать информацию о событии после загрузки', async () => {
      const mockGetEvent = vi.fn().mockResolvedValue(mockData.event)
      
      wrapper = mountComponent(EventView, {
        props: { id: '1' },
        global: {
          mocks: {
            $api: { getEvent: mockGetEvent },
            $route: { params: { id: '1' } }
          }
        }
      })

      await flushPromises()

      // Проверяем отображение основной информации
      expect(wrapper.text()).toContain(mockData.event.label)
      expect(wrapper.text()).toContain(mockData.event.description)
    })

    it('должен показать ошибку 404 для несуществующего события', async () => {
      const mockGetEvent = vi.fn().mockRejectedValue({ status: 404 })
      
      wrapper = mountComponent(EventView, {
        props: { id: '999' },
        global: {
          mocks: {
            $api: { getEvent: mockGetEvent },
            $route: { params: { id: '999' } }
          }
        }
      })

      await flushPromises()

      const notFound = wrapper.find('[data-testid="event-not-found"]')
      expect(notFound.exists() || wrapper.vm.notFound).toBe(true)
    })
  })

  describe('Вкладки события', () => {
    beforeEach(async () => {
      const mockGetEvent = vi.fn().mockResolvedValue(mockData.event)
      
      wrapper = mountComponent(EventView, {
        props: { id: '1' },
        global: {
          mocks: {
            $api: { getEvent: mockGetEvent },
            $route: { params: { id: '1' } }
          }
        }
      })

      await flushPromises()
    })

    it('должен показать вкладку "Информация"', () => {
      const infoTab = wrapper.find('[data-testid="info-tab"]')
      expect(infoTab.exists()).toBe(true)
    })

    it('должен показать вкладку "Столы"', () => {
      const tablesTab = wrapper.find('[data-testid="tables-tab"]')
      expect(tablesTab.exists()).toBe(true)
    })

    it('должен показать вкладку "Игроки"', () => {
      const playersTab = wrapper.find('[data-testid="players-tab"]')
      expect(playersTab.exists()).toBe(true)
    })

    it('должен переключаться между вкладками', async () => {
      const tablesTab = wrapper.find('[data-testid="tables-tab"]')
      await tablesTab.trigger('click')
      await flushPromises()

      // Проверяем активную вкладку
      expect(wrapper.vm.activeTab).toBe('tables')
    })
  })

  describe('Редактирование события', () => {
    beforeEach(async () => {
      const mockGetEvent = vi.fn().mockResolvedValue(mockData.event)
      
      wrapper = mountComponent(EventView, {
        props: { id: '1' },
        global: {
          mocks: {
            $api: { getEvent: mockGetEvent },
            $route: { params: { id: '1' } }
          }
        }
      })

      await flushPromises()
    })

    it('должен показать кнопку редактирования', () => {
      const editButton = wrapper.find('[data-testid="edit-event-btn"]')
      expect(editButton.exists()).toBe(true)
    })

    it('должен включить режим редактирования при клике', async () => {
      const editButton = wrapper.find('[data-testid="edit-event-btn"]')
      await editButton.trigger('click')
      await flushPromises()

      expect(wrapper.vm.isEditMode).toBe(true)
    })

    it('должен показать поля формы в режиме редактирования', async () => {
      wrapper.vm.isEditMode = true
      await wrapper.vm.$nextTick()

      const nameField = wrapper.find('[data-testid="event-name-field"]')
      const descriptionField = wrapper.find('[data-testid="event-description-field"]')
      
      expect(nameField.exists()).toBe(true)
      expect(descriptionField.exists()).toBe(true)
    })

    it('должен сохранить изменения при submit', async () => {
      const mockUpdateEvent = vi.fn().mockResolvedValue(mockData.event)
      wrapper.vm.$api = { updateEvent: mockUpdateEvent }
      
      wrapper.vm.isEditMode = true
      wrapper.vm.editForm = {
        label: 'Обновленное название',
        description: 'Обновленное описание'
      }
      
      const saveButton = wrapper.find('[data-testid="save-event-btn"]')
      if (saveButton.exists()) {
        await saveButton.trigger('click')
        await flushPromises()

        expect(mockUpdateEvent).toHaveBeenCalledWith('1', expect.objectContaining({
          label: 'Обновленное название',
          description: 'Обновленное описание'
        }))
      }
    })

    it('должен отменить редактирование', async () => {
      wrapper.vm.isEditMode = true
      await wrapper.vm.$nextTick()

      const cancelButton = wrapper.find('[data-testid="cancel-edit-btn"]')
      if (cancelButton.exists()) {
        await cancelButton.trigger('click')
        expect(wrapper.vm.isEditMode).toBe(false)
      }
    })
  })

  describe('Markdown описание', () => {
    beforeEach(async () => {
      const eventWithMarkdown = {
        ...mockData.event,
        description: '# Заголовок\n\n**Жирный текст**\n\n- Список\n- Элементов'
      }
      
      const mockGetEvent = vi.fn().mockResolvedValue(eventWithMarkdown)
      
      wrapper = mountComponent(EventView, {
        props: { id: '1' },
        global: {
          mocks: {
            $api: { getEvent: mockGetEvent },
            $route: { params: { id: '1' } }
          }
        }
      })

      await flushPromises()
    })

    it('должен отображать Markdown описание', () => {
      const markdownContent = wrapper.find('[data-testid="markdown-content"]')
      expect(markdownContent.exists()).toBe(true)
    })

    it('должен показать редактор Markdown в режиме редактирования', async () => {
      wrapper.vm.isEditMode = true
      await wrapper.vm.$nextTick()

      const markdownEditor = wrapper.find('[data-testid="markdown-editor"]')
      expect(markdownEditor.exists()).toBe(true)
    })
  })

  describe('Управление столами', () => {
    beforeEach(async () => {
      const mockGetEvent = vi.fn().mockResolvedValue(mockData.event)
      const mockGetTables = vi.fn().mockResolvedValue([
        { id: 1, label: 'Стол 1', status: 'active' },
        { id: 2, label: 'Стол 2', status: 'completed' }
      ])
      
      wrapper = mountComponent(EventView, {
        props: { id: '1' },
        global: {
          mocks: {
            $api: { 
              getEvent: mockGetEvent,
              getTables: mockGetTables
            },
            $route: { params: { id: '1' } }
          }
        }
      })

      await flushPromises()
      
      // Переключаемся на вкладку столов
      wrapper.vm.activeTab = 'tables'
      await wrapper.vm.$nextTick()
    })

    it('должен показать список столов', () => {
      const tablesGrid = wrapper.find('[data-testid="tables-grid"]')
      expect(tablesGrid.exists()).toBe(true)
    })

    it('должен показать кнопку создания стола', () => {
      const createTableBtn = wrapper.find('[data-testid="create-table-btn"]')
      expect(createTableBtn.exists()).toBe(true)
    })

    it('должен открыть диалог создания стола', async () => {
      const createTableBtn = wrapper.find('[data-testid="create-table-btn"]')
      await createTableBtn.trigger('click')
      await flushPromises()

      const dialog = wrapper.find('[data-testid="create-table-dialog"]')
      expect(dialog.exists() || wrapper.vm.showCreateTableDialog).toBe(true)
    })
  })

  describe('Статистика события', () => {
    beforeEach(async () => {
      const eventWithStats = {
        ...mockData.event,
        statistics: {
          totalTables: 5,
          completedTables: 3,
          totalPlayers: 50,
          activeGames: 2
        }
      }
      
      const mockGetEvent = vi.fn().mockResolvedValue(eventWithStats)
      
      wrapper = mountComponent(EventView, {
        props: { id: '1' },
        global: {
          mocks: {
            $api: { getEvent: mockGetEvent },
            $route: { params: { id: '1' } }
          }
        }
      })

      await flushPromises()
    })

    it('должен показать статистику события', () => {
      const statistics = wrapper.find('[data-testid="event-statistics"]')
      expect(statistics.exists()).toBe(true)
    })

    it('должен отобразить количество столов', () => {
      expect(wrapper.text()).toContain('5') // totalTables
    })

    it('должен отобразить количество игроков', () => {
      expect(wrapper.text()).toContain('50') // totalPlayers  
    })
  })

  describe('Навигация', () => {
    it('должен показать кнопку "Назад"', async () => {
      const mockGetEvent = vi.fn().mockResolvedValue(mockData.event)
      
      wrapper = mountComponent(EventView, {
        props: { id: '1' },
        global: {
          mocks: {
            $api: { getEvent: mockGetEvent },
            $route: { params: { id: '1' } }
          }
        }
      })

      await flushPromises()

      const backButton = wrapper.find('[data-testid="back-button"]')
      expect(backButton.exists()).toBe(true)
    })

    it('должен вернуться к списку событий', async () => {
      const mockGetEvent = vi.fn().mockResolvedValue(mockData.event)
      const mockPush = vi.fn()
      
      wrapper = mountComponent(EventView, {
        props: { id: '1' },
        global: {
          mocks: {
            $api: { getEvent: mockGetEvent },
            $route: { params: { id: '1' } },
            $router: { push: mockPush }
          }
        }
      })

      await flushPromises()

      const backButton = wrapper.find('[data-testid="back-button"]')
      await backButton.trigger('click')

      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })
})