// Тесты для компонента AppHeader

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import AppHeader from '@/components/common/AppHeader.vue'
import { mountComponent, createMockApiService, mockData, flushPromises } from '../../utils.js'

describe('AppHeader', () => {
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
      wrapper = mountComponent(AppHeader)
      await flushPromises()

      expect(wrapper.find('.app-header').exists()).toBe(true)
    })

    it('должен показать логотип', async () => {
      wrapper = mountComponent(AppHeader)
      await flushPromises()

      const logo = wrapper.find('[data-testid="app-logo"]')
      expect(logo.exists()).toBe(true)
    })

    it('должен показать навигационное меню', async () => {
      wrapper = mountComponent(AppHeader)
      await flushPromises()

      const nav = wrapper.find('[data-testid="main-navigation"]')
      expect(nav.exists()).toBe(true)
    })
  })

  describe('Навигационные ссылки', () => {
    beforeEach(async () => {
      wrapper = mountComponent(AppHeader, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()
    })

    it('должен показать ссылку на события', () => {
      const eventsLink = wrapper.find('[data-testid="events-link"]')
      expect(eventsLink.exists()).toBe(true)
      expect(eventsLink.text()).toContain('События')
    })

    it('должен показать ссылку на пользователей для админа', async () => {
      // Эмулируем авторизованного админа
      wrapper.vm.$store = {
        auth: {
          user: { ...mockData.user, role: 'admin' }
        }
      }
      await wrapper.vm.$nextTick()

      const usersLink = wrapper.find('[data-testid="users-link"]')
      expect(usersLink.exists()).toBe(true)
    })

    it('не должен показывать ссылку на пользователей для обычного пользователя', async () => {
      wrapper.vm.$store = {
        auth: {
          user: { ...mockData.user, role: 'user' }
        }
      }
      await wrapper.vm.$nextTick()

      const usersLink = wrapper.find('[data-testid="users-link"]')
      expect(usersLink.exists()).toBe(false)
    })
  })

  describe('Профиль пользователя', () => {
    beforeEach(async () => {
      wrapper = mountComponent(AppHeader, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()
    })

    it('должен показать кнопку профиля для авторизованного пользователя', async () => {
      wrapper.vm.$store = {
        auth: {
          user: mockData.user,
          isAuthenticated: true
        }
      }
      await wrapper.vm.$nextTick()

      const profileButton = wrapper.find('[data-testid="profile-button"]')
      expect(profileButton.exists()).toBe(true)
    })

    it('должен показать имя пользователя', async () => {
      wrapper.vm.$store = {
        auth: {
          user: mockData.user,
          isAuthenticated: true
        }
      }
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain(mockData.user.nickname)
    })

    it('должен показать кнопку входа для неавторизованного пользователя', async () => {
      wrapper.vm.$store = {
        auth: {
          user: null,
          isAuthenticated: false
        }
      }
      await wrapper.vm.$nextTick()

      const loginButton = wrapper.find('[data-testid="login-button"]')
      expect(loginButton.exists()).toBe(true)
      expect(loginButton.text()).toContain('Войти')
    })
  })

  describe('Выпадающее меню пользователя', () => {
    beforeEach(async () => {
      wrapper = mountComponent(AppHeader, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      
      wrapper.vm.$store = {
        auth: {
          user: mockData.user,
          isAuthenticated: true
        }
      }
      await wrapper.vm.$nextTick()
    })

    it('должен открыть меню при клике на профиль', async () => {
      const profileButton = wrapper.find('[data-testid="profile-button"]')
      await profileButton.trigger('click')
      await flushPromises()

      const dropdown = wrapper.find('[data-testid="profile-dropdown"]')
      expect(dropdown.exists()).toBe(true)
    })

    it('должен показать пункт "Профиль" в меню', async () => {
      const profileButton = wrapper.find('[data-testid="profile-button"]')
      await profileButton.trigger('click')
      await flushPromises()

      const profileItem = wrapper.find('[data-testid="profile-menu-item"]')
      expect(profileItem.exists()).toBe(true)
      expect(profileItem.text()).toContain('Профиль')
    })

    it('должен показать пункт "Выйти" в меню', async () => {
      const profileButton = wrapper.find('[data-testid="profile-button"]')
      await profileButton.trigger('click')
      await flushPromises()

      const logoutItem = wrapper.find('[data-testid="logout-menu-item"]')
      expect(logoutItem.exists()).toBe(true)
      expect(logoutItem.text()).toContain('Выйти')
    })
  })

  describe('Функция выхода', () => {
    beforeEach(async () => {
      wrapper = mountComponent(AppHeader, {
        global: {
          mocks: {
            $api: mockApi,
            $router: { push: vi.fn() }
          }
        }
      })
      
      wrapper.vm.$store = {
        auth: {
          user: mockData.user,
          isAuthenticated: true,
          logout: vi.fn()
        }
      }
      await wrapper.vm.$nextTick()
    })

    it('должен вызвать функцию выхода при клике на "Выйти"', async () => {
      const profileButton = wrapper.find('[data-testid="profile-button"]')
      await profileButton.trigger('click')
      await flushPromises()

      const logoutItem = wrapper.find('[data-testid="logout-menu-item"]')
      await logoutItem.trigger('click')
      await flushPromises()

      expect(wrapper.vm.$store.auth.logout).toHaveBeenCalled()
    })

    it('должен перенаправить на страницу входа после выхода', async () => {
      const mockPush = vi.fn()
      wrapper.vm.$router = { push: mockPush }

      const profileButton = wrapper.find('[data-testid="profile-button"]')
      await profileButton.trigger('click')
      await flushPromises()

      const logoutItem = wrapper.find('[data-testid="logout-menu-item"]')
      await logoutItem.trigger('click')
      await flushPromises()

      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  describe('Адаптивность', () => {
    beforeEach(async () => {
      wrapper = mountComponent(AppHeader)
      await flushPromises()
    })

    it('должен показать мобильное меню на малых экранах', async () => {
      // Эмулируем малый экран
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      })

      window.dispatchEvent(new Event('resize'))
      await wrapper.vm.$nextTick()

      const mobileMenu = wrapper.find('[data-testid="mobile-menu-button"]')
      expect(mobileMenu.exists()).toBe(true)
    })

    it('должен скрыть полное меню на мобильных устройствах', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      })

      window.dispatchEvent(new Event('resize'))
      await wrapper.vm.$nextTick()

      const fullMenu = wrapper.find('[data-testid="desktop-menu"]')
      expect(fullMenu.exists()).toBe(false)
    })
  })

  describe('Уведомления', () => {
    beforeEach(async () => {
      wrapper = mountComponent(AppHeader, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      
      wrapper.vm.$store = {
        auth: {
          user: mockData.user,
          isAuthenticated: true
        },
        notifications: {
          unreadCount: 3,
          items: []
        }
      }
      await wrapper.vm.$nextTick()
    })

    it('должен показать иконку уведомлений', () => {
      const notificationsIcon = wrapper.find('[data-testid="notifications-icon"]')
      expect(notificationsIcon.exists()).toBe(true)
    })

    it('должен показать количество непрочитанных уведомлений', () => {
      const badge = wrapper.find('[data-testid="notifications-badge"]')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toBe('3')
    })

    it('не должен показать badge при отсутствии уведомлений', async () => {
      wrapper.vm.$store.notifications.unreadCount = 0
      await wrapper.vm.$nextTick()

      const badge = wrapper.find('[data-testid="notifications-badge"]')
      expect(badge.exists()).toBe(false)
    })
  })
})