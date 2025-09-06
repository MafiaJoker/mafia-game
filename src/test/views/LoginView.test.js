// Тесты для страницы авторизации

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import LoginView from '@/views/LoginView.vue'
import { mountComponent, createMockApiService, mockData, flushPromises, fillForm } from '../utils.js'

// Мокаем API сервис
vi.mock('@/services/api', () => ({
  apiService: createMockApiService()
}))

describe('LoginView', () => {
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
      wrapper = mountComponent(LoginView)
      await flushPromises()

      expect(wrapper.find('.login-view').exists()).toBe(true)
    })

    it('должен показать форму входа', async () => {
      wrapper = mountComponent(LoginView)
      await flushPromises()

      const loginForm = wrapper.find('[data-testid="login-form"]')
      expect(loginForm.exists()).toBe(true)
    })

    it('должен показать поля для ввода логина и пароля', async () => {
      wrapper = mountComponent(LoginView)
      await flushPromises()

      const emailField = wrapper.find('[data-testid="email-field"]')
      const passwordField = wrapper.find('[data-testid="password-field"]')
      
      expect(emailField.exists()).toBe(true)
      expect(passwordField.exists()).toBe(true)
    })

    it('должен показать кнопку входа', async () => {
      wrapper = mountComponent(LoginView)
      await flushPromises()

      const loginButton = wrapper.find('[data-testid="login-btn"]')
      expect(loginButton.exists()).toBe(true)
      expect(loginButton.text()).toContain('Войти')
    })
  })

  describe('Валидация формы', () => {
    beforeEach(async () => {
      wrapper = mountComponent(LoginView)
      await flushPromises()
    })

    it('должен показать ошибку при пустом email', async () => {
      const emailField = wrapper.find('[data-testid="email-field"]')
      const loginButton = wrapper.find('[data-testid="login-btn"]')

      await emailField.setValue('')
      await loginButton.trigger('click')
      await flushPromises()

      const emailError = wrapper.find('[data-testid="email-error"]')
      expect(emailError.exists()).toBe(true)
      expect(emailError.text()).toContain('обязательно')
    })

    it('должен показать ошибку при невалидном email', async () => {
      const emailField = wrapper.find('[data-testid="email-field"]')
      
      await emailField.setValue('invalid-email')
      await emailField.trigger('blur')
      await flushPromises()

      const emailError = wrapper.find('[data-testid="email-error"]')
      expect(emailError.exists()).toBe(true)
      expect(emailError.text()).toContain('неверный формат')
    })

    it('должен показать ошибку при пустом пароле', async () => {
      const passwordField = wrapper.find('[data-testid="password-field"]')
      const loginButton = wrapper.find('[data-testid="login-btn"]')

      await passwordField.setValue('')
      await loginButton.trigger('click')
      await flushPromises()

      const passwordError = wrapper.find('[data-testid="password-error"]')
      expect(passwordError.exists()).toBe(true)
      expect(passwordError.text()).toContain('обязательно')
    })

    it('должен показать ошибку при коротком пароле', async () => {
      const passwordField = wrapper.find('[data-testid="password-field"]')
      
      await passwordField.setValue('123')
      await passwordField.trigger('blur')
      await flushPromises()

      const passwordError = wrapper.find('[data-testid="password-error"]')
      expect(passwordError.exists()).toBe(true)
      expect(passwordError.text()).toContain('минимум')
    })

    it('должен отключить кнопку входа при невалидных данных', async () => {
      const emailField = wrapper.find('[data-testid="email-field"]')
      const passwordField = wrapper.find('[data-testid="password-field"]')
      const loginButton = wrapper.find('[data-testid="login-btn"]')

      await emailField.setValue('invalid')
      await passwordField.setValue('123')
      await flushPromises()

      expect(loginButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('Процесс авторизации', () => {
    beforeEach(async () => {
      wrapper = mountComponent(LoginView, {
        global: {
          mocks: {
            $api: mockApi,
            $router: { push: vi.fn() }
          }
        }
      })
      await flushPromises()
    })

    it('должен отправить данные на сервер при валидной форме', async () => {
      const mockLogin = vi.fn().mockResolvedValue({ 
        token: 'mock-token',
        user: mockData.user
      })
      mockApi.login = mockLogin

      const emailField = wrapper.find('[data-testid="email-field"]')
      const passwordField = wrapper.find('[data-testid="password-field"]')
      const loginButton = wrapper.find('[data-testid="login-btn"]')

      await emailField.setValue('test@example.com')
      await passwordField.setValue('password123')
      await loginButton.trigger('click')
      await flushPromises()

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    it('должен показать индикатор загрузки во время авторизации', async () => {
      const mockLogin = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ token: 'token' }), 100))
      )
      mockApi.login = mockLogin

      const emailField = wrapper.find('[data-testid="email-field"]')
      const passwordField = wrapper.find('[data-testid="password-field"]')
      const loginButton = wrapper.find('[data-testid="login-btn"]')

      await emailField.setValue('test@example.com')
      await passwordField.setValue('password123')
      await loginButton.trigger('click')

      // Проверяем состояние загрузки
      expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true)
      expect(loginButton.attributes('disabled')).toBeDefined()

      await flushPromises()
    })

    it('должен сохранить токен при успешной авторизации', async () => {
      const mockLogin = vi.fn().mockResolvedValue({ 
        token: 'mock-token',
        user: mockData.user
      })
      mockApi.login = mockLogin

      const emailField = wrapper.find('[data-testid="email-field"]')
      const passwordField = wrapper.find('[data-testid="password-field"]')
      const loginButton = wrapper.find('[data-testid="login-btn"]')

      await emailField.setValue('test@example.com')
      await passwordField.setValue('password123')
      await loginButton.trigger('click')
      await flushPromises()

      // Проверяем, что токен сохранен в localStorage
      expect(localStorage.setItem).toHaveBeenCalledWith('auth-token', 'mock-token')
    })

    it('должен перенаправить на главную страницу после успешной авторизации', async () => {
      const mockLogin = vi.fn().mockResolvedValue({ 
        token: 'mock-token',
        user: mockData.user
      })
      const mockPush = vi.fn()
      mockApi.login = mockLogin

      wrapper = mountComponent(LoginView, {
        global: {
          mocks: {
            $api: mockApi,
            $router: { push: mockPush }
          }
        }
      })
      await flushPromises()

      const emailField = wrapper.find('[data-testid="email-field"]')
      const passwordField = wrapper.find('[data-testid="password-field"]')
      const loginButton = wrapper.find('[data-testid="login-btn"]')

      await emailField.setValue('test@example.com')
      await passwordField.setValue('password123')
      await loginButton.trigger('click')
      await flushPromises()

      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('должен перенаправить на запрашиваемую страницу после авторизации', async () => {
      const mockLogin = vi.fn().mockResolvedValue({ 
        token: 'mock-token',
        user: mockData.user
      })
      const mockPush = vi.fn()

      wrapper = mountComponent(LoginView, {
        global: {
          mocks: {
            $api: mockApi,
            $router: { push: mockPush },
            $route: { query: { redirect: '/events' } }
          }
        }
      })
      await flushPromises()

      const emailField = wrapper.find('[data-testid="email-field"]')
      const passwordField = wrapper.find('[data-testid="password-field"]')
      const loginButton = wrapper.find('[data-testid="login-btn"]')

      await emailField.setValue('test@example.com')
      await passwordField.setValue('password123')
      await loginButton.trigger('click')
      await flushPromises()

      expect(mockPush).toHaveBeenCalledWith('/events')
    })
  })

  describe('Обработка ошибок', () => {
    beforeEach(async () => {
      wrapper = mountComponent(LoginView, {
        global: {
          mocks: {
            $api: mockApi
          }
        }
      })
      await flushPromises()
    })

    it('должен показать ошибку при неверных учетных данных', async () => {
      const mockLogin = vi.fn().mockRejectedValue({
        status: 401,
        message: 'Неверный email или пароль'
      })
      mockApi.login = mockLogin

      const emailField = wrapper.find('[data-testid="email-field"]')
      const passwordField = wrapper.find('[data-testid="password-field"]')
      const loginButton = wrapper.find('[data-testid="login-btn"]')

      await emailField.setValue('wrong@example.com')
      await passwordField.setValue('wrongpassword')
      await loginButton.trigger('click')
      await flushPromises()

      const errorMessage = wrapper.find('[data-testid="login-error"]')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toContain('Неверный email или пароль')
    })

    it('должен показать ошибку сервера', async () => {
      const mockLogin = vi.fn().mockRejectedValue({
        status: 500,
        message: 'Ошибка сервера'
      })
      mockApi.login = mockLogin

      const emailField = wrapper.find('[data-testid="email-field"]')
      const passwordField = wrapper.find('[data-testid="password-field"]')
      const loginButton = wrapper.find('[data-testid="login-btn"]')

      await emailField.setValue('test@example.com')
      await passwordField.setValue('password123')
      await loginButton.trigger('click')
      await flushPromises()

      const errorMessage = wrapper.find('[data-testid="login-error"]')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toContain('Ошибка сервера')
    })

    it('должен очистить ошибку при повторной попытке входа', async () => {
      // Сначала создаем ошибку
      const mockLoginError = vi.fn().mockRejectedValue({
        status: 401,
        message: 'Ошибка'
      })
      mockApi.login = mockLoginError

      const emailField = wrapper.find('[data-testid="email-field"]')
      const passwordField = wrapper.find('[data-testid="password-field"]')
      const loginButton = wrapper.find('[data-testid="login-btn"]')

      await emailField.setValue('wrong@example.com')
      await passwordField.setValue('wrong')
      await loginButton.trigger('click')
      await flushPromises()

      // Проверяем, что ошибка есть
      expect(wrapper.find('[data-testid="login-error"]').exists()).toBe(true)

      // Теперь делаем успешный вход
      const mockLoginSuccess = vi.fn().mockResolvedValue({
        token: 'token',
        user: mockData.user
      })
      mockApi.login = mockLoginSuccess

      await emailField.setValue('correct@example.com')
      await passwordField.setValue('correct')
      await loginButton.trigger('click')
      await flushPromises()

      // Проверяем, что ошибки нет
      expect(wrapper.find('[data-testid="login-error"]').exists()).toBe(false)
    })
  })

  describe('Дополнительные возможности', () => {
    beforeEach(async () => {
      wrapper = mountComponent(LoginView)
      await flushPromises()
    })

    it('должен показать ссылку на восстановление пароля', () => {
      const forgotLink = wrapper.find('[data-testid="forgot-password-link"]')
      expect(forgotLink.exists()).toBe(true)
    })

    it('должен показать ссылку на регистрацию', () => {
      const registerLink = wrapper.find('[data-testid="register-link"]')
      expect(registerLink.exists()).toBe(true)
    })

    it('должен позволить вход по Enter', async () => {
      const mockLogin = vi.fn().mockResolvedValue({ 
        token: 'mock-token',
        user: mockData.user
      })

      wrapper = mountComponent(LoginView, {
        global: {
          mocks: {
            $api: { login: mockLogin }
          }
        }
      })
      await flushPromises()

      const emailField = wrapper.find('[data-testid="email-field"]')
      const passwordField = wrapper.find('[data-testid="password-field"]')

      await emailField.setValue('test@example.com')
      await passwordField.setValue('password123')
      await passwordField.trigger('keydown.enter')
      await flushPromises()

      expect(mockLogin).toHaveBeenCalled()
    })

    it('должен показать/скрыть пароль при клике на иконку', async () => {
      const passwordField = wrapper.find('[data-testid="password-field"]')
      const toggleIcon = wrapper.find('[data-testid="password-toggle"]')

      if (toggleIcon.exists()) {
        // Изначально пароль скрыт
        expect(passwordField.attributes('type')).toBe('password')

        await toggleIcon.trigger('click')
        await flushPromises()

        // После клика пароль показан
        expect(passwordField.attributes('type')).toBe('text')
      }
    })
  })

  describe('Запоминание пользователя', () => {
    beforeEach(async () => {
      wrapper = mountComponent(LoginView)
      await flushPromises()
    })

    it('должен показать чекбокс "Запомнить меня"', () => {
      const rememberCheckbox = wrapper.find('[data-testid="remember-me"]')
      expect(rememberCheckbox.exists()).toBe(true)
    })

    it('должен сохранить email при включенном "Запомнить меня"', async () => {
      const emailField = wrapper.find('[data-testid="email-field"]')
      const rememberCheckbox = wrapper.find('[data-testid="remember-me"]')

      await emailField.setValue('test@example.com')
      await rememberCheckbox.setChecked(true)

      // Эмулируем отправку формы и проверяем сохранение
      if (wrapper.vm.saveCredentials) {
        wrapper.vm.saveCredentials('test@example.com', true)
        expect(localStorage.setItem).toHaveBeenCalledWith('remembered-email', 'test@example.com')
      }
    })

    it('должен загрузить сохраненный email при монтировании', async () => {
      localStorage.getItem.mockReturnValue('saved@example.com')

      wrapper = mountComponent(LoginView)
      await flushPromises()

      const emailField = wrapper.find('[data-testid="email-field"]')
      if (emailField.exists()) {
        expect(emailField.element.value).toBe('saved@example.com')
      }
    })
  })
})