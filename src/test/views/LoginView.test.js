// Вход: основной путь - виджет Telegram, на стендах с VITE_SHOW_TEST_LOGIN=true
// рядом кнопка тестового пользователя; вошедшего страница сразу уводит на главную

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import LoginView from '@/views/LoginView.vue'
import TelegramLoginWidget from '@/components/auth/TelegramLoginWidget.vue'
import { useAuthStore } from '@/stores/auth'

// Сам вход подменяется на уровне стора, до API страница не доходит
vi.mock('@/services/api', () => ({
  apiService: {},
  initApiUrl: vi.fn()
}))

vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

const Blank = { render: () => null }

const mountLogin = async (user = null) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.user = user

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Blank },
      { path: '/login', component: Blank }
    ]
  })
  router.push('/login')
  await router.isReady()

  // Настоящий виджет грузит скрипт с telegram.org - в тестах только его пропсы
  const wrapper = mount(LoginView, {
    global: { plugins: [pinia, router], stubs: { TelegramLoginWidget: true } }
  })
  await flushPromises()
  return { wrapper, router, authStore }
}

const testLoginButton = (wrapper) => wrapper.findAll('button')
  .find(btn => btn.text() === 'Войти как тестовый пользователь')

enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('LoginView: виджет Telegram', () => {
  it('отдаёт виджету бота из окружения, без настройки - бота dev-стенда', async () => {
    vi.stubEnv('VITE_TELEGRAM_BOT_USERNAME', 'joker_mafia_bot')
    const { wrapper } = await mountLogin()
    expect(wrapper.findComponent(TelegramLoginWidget).props('botUsername')).toBe('joker_mafia_bot')

    vi.stubEnv('VITE_TELEGRAM_BOT_USERNAME', undefined)
    const { wrapper: unset } = await mountLogin()
    expect(unset.findComponent(TelegramLoginWidget).props('botUsername'))
      .toBe('dev_mafia_joker_widget_bot')
  })
})

describe('LoginView: тестовый пользователь', () => {
  // Флаг страница читает при каждом монтировании, а не при импорте модуля:
  // перезагружать модули ради него не нужно
  beforeEach(() => {
    vi.stubEnv('VITE_SHOW_TEST_LOGIN', 'true')
  })

  it('кнопку показывает только при VITE_SHOW_TEST_LOGIN=true', async () => {
    const { wrapper: stand } = await mountLogin()
    expect(testLoginButton(stand)).toBeDefined()

    vi.stubEnv('VITE_SHOW_TEST_LOGIN', 'false')
    const { wrapper: prod } = await mountLogin()
    expect(testLoginButton(prod)).toBeUndefined()
  })

  it('после входа показывает тост и уводит на главную', async () => {
    const { wrapper, router, authStore } = await mountLogin()
    const testUserLogin = vi.spyOn(authStore, 'testUserLogin').mockResolvedValue({ success: true })

    await testLoginButton(wrapper).trigger('click')
    await flushPromises()

    expect(testUserLogin).toHaveBeenCalledTimes(1)
    expect(ElMessage.success).toHaveBeenCalledWith('Вход выполнен как тестовый пользователь')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('при отказе показывает ошибку и оставляет на странице входа', async () => {
    const { wrapper, router, authStore } = await mountLogin()
    vi.spyOn(authStore, 'testUserLogin')
      .mockResolvedValue({ success: false, error: 'Тестовый вход отключён' })

    await testLoginButton(wrapper).trigger('click')
    await flushPromises()

    expect(ElMessage.error).toHaveBeenCalledWith('Тестовый вход отключён')
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('пока вход идёт, повторный клик второй вход не запускает', async () => {
    const { wrapper, authStore } = await mountLogin()
    let answer
    const testUserLogin = vi.spyOn(authStore, 'testUserLogin')
      .mockReturnValue(new Promise(resolve => { answer = resolve }))

    await testLoginButton(wrapper).trigger('click')
    await testLoginButton(wrapper).trigger('click')

    expect(testUserLogin).toHaveBeenCalledTimes(1)
    expect(testLoginButton(wrapper).classes()).toContain('is-loading')

    // После ответа кнопка снова рабочая: неудачный вход можно повторить
    answer({ success: false, error: 'Тестовый вход отключён' })
    await flushPromises()
    await testLoginButton(wrapper).trigger('click')
    await flushPromises()

    expect(testUserLogin).toHaveBeenCalledTimes(2)
  })
})

describe('LoginView: уже вошедший пользователь', () => {
  it('сразу уводит на главную, гостя оставляет на входе', async () => {
    const { router } = await mountLogin({ id: 'user-1', nickname: 'Батон', roles: ['player'] })
    expect(router.currentRoute.value.path).toBe('/')

    const { router: guestRouter } = await mountLogin()
    expect(guestRouter.currentRoute.value.path).toBe('/login')
  })
})
