// Шапка приложения: пункты меню собираются из ролей пользователя, выход -
// только после подтверждения, на телефоне меню уезжает в выдвижную панель.
// Рассадку видят все, и аноним тоже: вместо аватара у него «Войти»

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ElMessage, ElMessageBox, ElMenuItem, ElDrawer } from 'element-plus'
import AppHeader from '@/components/common/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'

// Выход подменяется на уровне стора, до API шапка не доходит
vi.mock('@/services/api', () => ({
  apiService: {},
  initApiUrl: vi.fn()
}))

vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

const DESKTOP_WIDTH = window.innerWidth

const Blank = { render: () => null }

const currentUser = (overrides = {}) => ({
  id: 'user-1',
  nickname: 'Батон',
  first_name: 'Иван',
  last_name: 'Петров',
  roles: ['player'],
  ...overrides
})

// Аноним - user: null после законченной проверки сессии
const mountHeader = async (user = currentUser(), { path = '/ratings', initialized = true } = {}) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.user = user
  authStore.isInitialized = initialized

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      ...['/', '/ratings', '/event-types', '/users', '/tariffs', '/profile', '/login']
        .map(path => ({ path, component: Blank })),
      { path: '/seating/:id?', name: 'Seating', component: Blank }
    ]
  })
  router.push(path)
  await router.isReady()

  const wrapper = mount(AppHeader, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, router, authStore }
}

// Панель на телефоне уходит в body - findAllComponents находит пункты и там
const menuLabels = (wrapper) => wrapper.findAllComponents(ElMenuItem)
  .map(item => item.text())

const menuItem = (wrapper, label) => wrapper.findAllComponents(ElMenuItem)
  .find(item => item.text() === label)

// Выпадающее меню пользователя Element Plus тоже рисует в body, а в тестовом
// окружении - сразу, без открытия: пункт можно нажимать напрямую
const userMenuItem = (label) => [...document.querySelectorAll('.el-dropdown-menu__item')]
  .find(item => item.textContent.trim() === label)

const chooseUserMenuItem = async (label) => {
  userMenuItem(label).click()
  await flushPromises()
}

// Ширина экрана у всех обёрток общая: без автоотмонтирования её смена
// перерисовывала бы шапки прошлых тестов
enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AppHeader: меню по ролям', () => {
  it.each([
    ['игроку', 'Рейтинг, Рассадка', ['player']],
    ['ведущему', 'Рейтинг, Мероприятия, Категории, Рассадка', ['game_master']],
    ['кассиру', 'Рейтинг, Тарифы, Рассадка', ['cashier']],
    ['админу', 'Рейтинг, Пользователи, Рассадка', ['admin']]
  ])('%s показывает в меню: %s', async (who, items, roles) => {
    const { wrapper } = await mountHeader(currentUser({ roles }))

    expect(menuLabels(wrapper).join(', ')).toBe(items)
  })

  it('выбор пункта меню открывает его страницу', async () => {
    const { wrapper, router } = await mountHeader(currentUser({ roles: ['admin'] }))

    await menuItem(wrapper, 'Пользователи').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/users')
  })

  it('рассадка по ссылке подсвечивает пункт «Рассадка»', async () => {
    const { wrapper } = await mountHeader(currentUser(), { path: '/seating/seating-1' })

    expect(menuItem(wrapper, 'Рассадка').classes()).toContain('is-active')
  })
})

describe('AppHeader для анонима', () => {
  it('в меню только «Рассадка», вместо аватара - «Войти»', async () => {
    const { wrapper } = await mountHeader(null, { path: '/seating' })

    expect(menuLabels(wrapper)).toEqual(['Рассадка'])
    expect(wrapper.find('.user-info').exists()).toBe(false)
    expect(wrapper.find('[data-testid="login-button"]').text()).toBe('Войти')
  })

  it('«Войти» ведет на страницу входа', async () => {
    const { wrapper, router } = await mountHeader(null, { path: '/seating' })

    await wrapper.find('[data-testid="login-button"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('пока сессия проверяется, не показывает ни аватар, ни «Войти»', async () => {
    const { wrapper } = await mountHeader(null, { path: '/seating', initialized: false })

    expect(wrapper.find('.user-info').exists()).toBe(false)
    expect(wrapper.find('[data-testid="login-button"]').exists()).toBe(false)
  })
})

describe('AppHeader: блок пользователя', () => {
  const avatarText = (wrapper) => wrapper.find('.user-info .el-avatar').text()

  it('показывает ник, а в аватаре - инициалы имени и фамилии или первую букву ника', async () => {
    const { wrapper } = await mountHeader(currentUser({ first_name: 'иван', last_name: 'петров' }))

    expect(wrapper.find('.user-name').text()).toBe('Батон')
    expect(avatarText(wrapper)).toBe('ИП')

    // Имени в Telegram может не быть - тогда инициал берётся из ника
    const { wrapper: noName } = await mountHeader(
      currentUser({ nickname: 'батон', first_name: null, last_name: null })
    )
    expect(avatarText(noName)).toBe('Б')
  })

  it('«Профиль» открывает страницу профиля', async () => {
    const { router } = await mountHeader()

    await chooseUserMenuItem('Профиль')

    expect(router.currentRoute.value.path).toBe('/profile')
  })

  it('«Выйти» сначала спрашивает подтверждение и выходит только после него', async () => {
    let confirm
    vi.spyOn(ElMessageBox, 'confirm')
      .mockReturnValue(new Promise(resolve => { confirm = resolve }))
    const { authStore } = await mountHeader()
    const logout = vi.spyOn(authStore, 'logout').mockResolvedValue()

    await chooseUserMenuItem('Выйти')

    expect(ElMessageBox.confirm).toHaveBeenCalledTimes(1)
    expect(logout).not.toHaveBeenCalled()

    confirm('confirm')
    await flushPromises()

    expect(logout).toHaveBeenCalledTimes(1)
    expect(ElMessage.success).toHaveBeenCalledWith('Вы вышли из системы')
  })

  it('отмена подтверждения оставляет пользователя в системе', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue('cancel')
    const { authStore } = await mountHeader()
    const logout = vi.spyOn(authStore, 'logout').mockResolvedValue()

    await chooseUserMenuItem('Выйти')

    expect(logout).not.toHaveBeenCalled()
    expect(ElMessage.success).not.toHaveBeenCalled()
  })
})

describe('AppHeader: подписи пунктов на узких экранах', () => {
  afterEach(() => {
    window.innerWidth = DESKTOP_WIDTH
  })

  const ALL_ROLES = ['admin', 'cashier', 'game_master', 'player']
  const iconsOnly = (wrapper) => wrapper.find('.app-menu').classes().includes('app-menu--icons')

  it.each([
    ['у анонима одна «Рассадка» - с подписью и на портретном планшете', null, 800, false],
    ['четыре пункта ведущего на портретном планшете - иконками', ['game_master'], 800, true],
    ['четыре пункта ведущего на альбомном планшете - с подписями', ['game_master'], 960, false],
    ['шесть пунктов на узком компьютере - иконками', ALL_ROLES, 1100, true],
    ['шесть пунктов на широком экране - с подписями', ALL_ROLES, 1366, false]
  ])('%s', async (title, roles, width, expected) => {
    window.innerWidth = width
    const { wrapper } = await mountHeader(roles ? currentUser({ roles }) : null, { path: '/seating' })

    expect(iconsOnly(wrapper)).toBe(expected)
  })
})

describe('AppHeader на телефоне', () => {
  beforeEach(() => {
    window.innerWidth = 375
  })

  afterEach(() => {
    window.innerWidth = DESKTOP_WIDTH
  })

  const openDrawer = async (wrapper) => {
    await wrapper.find('button[aria-label="Открыть меню"]').trigger('click')
    await flushPromises()
  }

  it('вместо горизонтального меню - кнопка, открывающая панель с теми же пунктами', async () => {
    const { wrapper } = await mountHeader(currentUser({ roles: ['game_master'] }))

    expect(wrapper.find('.el-menu--horizontal').exists()).toBe(false)

    await openDrawer(wrapper)

    expect(wrapper.findComponent(ElDrawer).props('modelValue')).toBe(true)
    expect(menuLabels(wrapper)).toEqual(['Рейтинг', 'Мероприятия', 'Категории', 'Рассадка'])
  })

  it('аноним видит в панели вход вместо профиля и выхода', async () => {
    const { wrapper, router } = await mountHeader(null, { path: '/seating' })
    await openDrawer(wrapper)

    expect(menuLabels(wrapper)).toEqual(['Рассадка'])
    expect(document.querySelector('.app-nav-drawer .drawer-user')).toBeNull()
    const drawerButton = document.querySelector('.app-nav-drawer .drawer-action')
    expect(drawerButton.textContent.trim()).toBe('Войти')

    drawerButton.click()
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(wrapper.findComponent(ElDrawer).props('modelValue')).toBe(false)
  })

  it('выбор пункта в панели закрывает её и открывает страницу', async () => {
    const { wrapper, router } = await mountHeader(currentUser({ roles: ['game_master'] }))
    await openDrawer(wrapper)

    await menuItem(wrapper, 'Категории').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/event-types')
    expect(wrapper.findComponent(ElDrawer).props('modelValue')).toBe(false)
  })
})
