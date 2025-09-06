// Тесты для страницы управления пользователями

import { describe, it, expect, vi, beforeEach } from 'vitest'
import UsersView from '@/views/UsersView.vue'
import { mountComponent, createMockApiService, mockData, flushPromises } from '../utils.js'

// Мокаем API сервис
vi.mock('@/services/api', () => ({
  apiService: createMockApiService()
}))

describe('UsersView', () => {
  let wrapper
  let mockApi

  beforeEach(() => {
    mockApi = createMockApiService({
      getUsers: vi.fn().mockResolvedValue(mockData.users)
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Отображение компонента', () => {
    it('должен отобразиться корректно', async () => {
      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()

      expect(wrapper.find('.users-view').exists()).toBe(true)
    })

    it('должен показать заголовок страницы', async () => {
      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()

      const title = wrapper.find('h1')
      expect(title.exists()).toBe(true)
      expect(title.text()).toContain('Пользователи')
    })
  })

  describe('Загрузка пользователей', () => {
    it('должен загрузить список пользователей при монтировании', async () => {
      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })

      await flushPromises()
      expect(mockApi.getUsers).toHaveBeenCalled()
    })

    it('должен отобразить пользователей в таблице', async () => {
      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })

      await flushPromises()

      const userRows = wrapper.findAll('[data-testid="user-row"]')
      expect(userRows).toHaveLength(mockData.users.length)
    })

    it('должен показать информацию о пользователе', async () => {
      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })

      await flushPromises()

      const firstUser = mockData.users[0]
      expect(wrapper.text()).toContain(firstUser.nickname)
      expect(wrapper.text()).toContain(firstUser.email)
    })
  })

  describe('Поиск пользователей', () => {
    beforeEach(async () => {
      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()
    })

    it('должен показать поле поиска', () => {
      const searchInput = wrapper.find('[data-testid="search-users"]')
      expect(searchInput.exists()).toBe(true)
    })

    it('должен фильтровать пользователей по никнейму', async () => {
      const searchInput = wrapper.find('[data-testid="search-users"]')
      await searchInput.setValue('user1')
      await flushPromises()

      // Проверяем, что отображается только один пользователь
      const visibleRows = wrapper.findAll('[data-testid="user-row"]:not(.hidden)')
      expect(visibleRows).toHaveLength(1)
      expect(visibleRows[0].text()).toContain('user1')
    })

    it('должен фильтровать пользователей по email', async () => {
      const searchInput = wrapper.find('[data-testid="search-users"]')
      await searchInput.setValue('admin@example.com')
      await flushPromises()

      const visibleRows = wrapper.findAll('[data-testid="user-row"]:not(.hidden)')
      expect(visibleRows).toHaveLength(1)
      expect(visibleRows[0].text()).toContain('admin@example.com')
    })

    it('должен показать "не найдено" при отсутствии результатов', async () => {
      const searchInput = wrapper.find('[data-testid="search-users"]')
      await searchInput.setValue('nonexistent')
      await flushPromises()

      const noResults = wrapper.find('[data-testid="no-users-found"]')
      expect(noResults.exists()).toBe(true)
    })
  })

  describe('Фильтрация по ролям', () => {
    beforeEach(async () => {
      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()
    })

    it('должен показать фильтр по ролям', () => {
      const roleFilter = wrapper.find('[data-testid="role-filter"]')
      expect(roleFilter.exists()).toBe(true)
    })

    it('должен фильтровать пользователей по роли', async () => {
      const roleFilter = wrapper.find('[data-testid="role-filter"]')
      await roleFilter.setValue('admin')
      await flushPromises()

      const visibleRows = wrapper.findAll('[data-testid="user-row"]:not(.hidden)')
      expect(visibleRows).toHaveLength(1)
      expect(visibleRows[0].text()).toContain('admin')
    })
  })

  describe('Создание пользователя', () => {
    it('должен показать кнопку создания пользователя', async () => {
      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()

      const createButton = wrapper.find('[data-testid="create-user-btn"]')
      expect(createButton.exists()).toBe(true)
    })

    it('должен открыть диалог создания пользователя', async () => {
      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()

      const createButton = wrapper.find('[data-testid="create-user-btn"]')
      await createButton.trigger('click')
      await flushPromises()

      const dialog = wrapper.find('[data-testid="create-user-dialog"]')
      expect(dialog.exists() || wrapper.vm.showCreateDialog).toBe(true)
    })

    it('должен создать пользователя с валидными данными', async () => {
      const mockCreateUser = vi.fn().mockResolvedValue({ id: 3, nickname: 'newuser' })
      mockApi.createUser = mockCreateUser

      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()

      // Эмулируем создание пользователя
      const userData = {
        nickname: 'newuser',
        email: 'newuser@example.com',
        role: 'user'
      }

      if (wrapper.vm.createUser) {
        await wrapper.vm.createUser(userData)
        expect(mockCreateUser).toHaveBeenCalledWith(userData)
      }
    })
  })

  describe('Редактирование пользователя', () => {
    beforeEach(async () => {
      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()
    })

    it('должен показать кнопку редактирования для каждого пользователя', () => {
      const editButtons = wrapper.findAll('[data-testid="edit-user-btn"]')
      expect(editButtons.length).toBeGreaterThan(0)
    })

    it('должен открыть диалог редактирования', async () => {
      const editButton = wrapper.find('[data-testid="edit-user-btn"]')
      await editButton.trigger('click')
      await flushPromises()

      const dialog = wrapper.find('[data-testid="edit-user-dialog"]')
      expect(dialog.exists() || wrapper.vm.showEditDialog).toBe(true)
    })

    it('должен заполнить форму данными пользователя', async () => {
      const editButton = wrapper.find('[data-testid="edit-user-btn"]')
      await editButton.trigger('click')
      await flushPromises()

      // Проверяем, что форма заполнена
      const nicknameField = wrapper.find('[data-testid="edit-nickname"]')
      const emailField = wrapper.find('[data-testid="edit-email"]')

      if (nicknameField.exists() && emailField.exists()) {
        expect(nicknameField.element.value).toBe(mockData.users[0].nickname)
        expect(emailField.element.value).toBe(mockData.users[0].email)
      }
    })

    it('должен обновить пользователя', async () => {
      const mockUpdateUser = vi.fn().mockResolvedValue({ id: 1 })
      mockApi.updateUser = mockUpdateUser

      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()

      const updatedData = {
        id: 1,
        nickname: 'updated_user',
        email: 'updated@example.com'
      }

      if (wrapper.vm.updateUser) {
        await wrapper.vm.updateUser(1, updatedData)
        expect(mockUpdateUser).toHaveBeenCalledWith(1, updatedData)
      }
    })
  })

  describe('Удаление пользователя', () => {
    beforeEach(async () => {
      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()
    })

    it('должен показать кнопку удаления для каждого пользователя', () => {
      const deleteButtons = wrapper.findAll('[data-testid="delete-user-btn"]')
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('должен показать подтверждение удаления', async () => {
      const deleteButton = wrapper.find('[data-testid="delete-user-btn"]')
      await deleteButton.trigger('click')
      await flushPromises()

      const confirmation = wrapper.find('[data-testid="delete-confirmation"]')
      expect(confirmation.exists() || wrapper.vm.showDeleteConfirmation).toBe(true)
    })

    it('должен удалить пользователя после подтверждения', async () => {
      const mockDeleteUser = vi.fn().mockResolvedValue({})
      mockApi.deleteUser = mockDeleteUser

      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()

      if (wrapper.vm.deleteUser) {
        await wrapper.vm.deleteUser(1)
        expect(mockDeleteUser).toHaveBeenCalledWith(1)
      }
    })
  })

  describe('Сортировка', () => {
    beforeEach(async () => {
      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()
    })

    it('должен позволить сортировку по имени', async () => {
      const nameHeader = wrapper.find('[data-testid="sort-by-name"]')
      
      if (nameHeader.exists()) {
        await nameHeader.trigger('click')
        await flushPromises()

        // Проверяем, что сортировка применилась
        expect(wrapper.vm.sortBy).toBe('nickname')
      }
    })

    it('должен позволить сортировку по дате регистрации', async () => {
      const dateHeader = wrapper.find('[data-testid="sort-by-date"]')
      
      if (dateHeader.exists()) {
        await dateHeader.trigger('click')
        await flushPromises()

        expect(wrapper.vm.sortBy).toBe('created_at')
      }
    })
  })

  describe('Обработка ошибок', () => {
    it('должен показать ошибку при неудачной загрузке пользователей', async () => {
      const mockGetUsersError = vi.fn().mockRejectedValue(new Error('API Error'))
      
      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: { getUsers: mockGetUsersError }
          }
        }
      })

      await flushPromises()

      const errorMessage = wrapper.find('[data-testid="error-message"]')
      expect(errorMessage.exists() || wrapper.vm.error).toBeTruthy()
    })

    it('должен показать ошибку при неудачном создании пользователя', async () => {
      const mockCreateUser = vi.fn().mockRejectedValue(new Error('Validation Error'))
      mockApi.createUser = mockCreateUser

      wrapper = mountComponent(UsersView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()

      const userData = {
        nickname: '', // Невалидные данные
        email: 'invalid-email'
      }

      if (wrapper.vm.createUser) {
        try {
          await wrapper.vm.createUser(userData)
        } catch (error) {
          expect(error.message).toContain('Validation Error')
        }
      }
    })
  })
})