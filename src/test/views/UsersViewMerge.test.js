// Экран пользователей после появления слияния: групповое действие и история
// живут рядом с прежним списком и не мешают ему

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import UsersView from '@/views/UsersView.vue'
import UserMergeDialog from '@/components/users/UserMergeDialog.vue'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    getUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    getRoles: vi.fn(),
    mergeUsers: vi.fn(),
    getUserMerges: vi.fn()
  },
  initApiUrl: vi.fn()
}))

vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

const mountView = async (roles = ['admin']) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const { useAuthStore } = await import('@/stores/auth')
  const authStore = useAuthStore()
  authStore.user = { id: 'admin-1', nickname: 'Админ', roles }

  const wrapper = mount(UsersView, { global: { plugins: [pinia] } })
  await flushPromises()
  return wrapper
}

const tab = (wrapper, label) => wrapper.findAll('.el-tabs__item')
  .find(item => item.text() === label)

const button = (wrapper, label) => wrapper.findAll('button')
  .find(btn => btn.text() === label)

describe('UsersView: слияние пользователей', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiService.getUsers.mockResolvedValue({ items: [{ id: 'user-1', nickname: 'Батон' }], total: 1 })
    apiService.getRoles.mockResolvedValue([])
    apiService.getUserMerges.mockResolvedValue({ items: [], total: 0 })
  })

  it('админу даёт кнопку объединения и вкладку истории', async () => {
    const wrapper = await mountView()

    expect(button(wrapper, 'Объединить')).toBeDefined()
    expect(tab(wrapper, 'Пользователи')).toBeDefined()
    expect(tab(wrapper, 'История слияний')).toBeDefined()
  })

  it('судье не показывает ни кнопку, ни историю', async () => {
    const wrapper = await mountView(['game_master'])

    expect(button(wrapper, 'Объединить')).toBeUndefined()
    expect(tab(wrapper, 'История слияний')).toBeUndefined()
  })

  it('кнопка открывает модалку слияния', async () => {
    const wrapper = await mountView()

    await button(wrapper, 'Объединить').trigger('click')
    await flushPromises()

    expect(wrapper.findComponent(UserMergeDialog).props('modelValue')).toBe(true)
  })

  it('историю грузит при первом открытии вкладки, а не вместе с экраном', async () => {
    const wrapper = await mountView()

    expect(apiService.getUserMerges).not.toHaveBeenCalled()

    await tab(wrapper, 'История слияний').trigger('click')
    await flushPromises()

    expect(apiService.getUserMerges).toHaveBeenCalledTimes(1)
  })

  it('после слияния перезагружает список пользователей', async () => {
    const wrapper = await mountView()
    apiService.getUsers.mockClear()

    wrapper.findComponent(UserMergeDialog).vm.$emit('merged', {
      report: { result: { nickname: 'Батон' } },
      target: { id: 'user-1', nickname: 'Батон' },
      sources: [{ id: 'user-2', nickname: 'Батон-дубль' }]
    })
    await flushPromises()

    expect(apiService.getUsers).toHaveBeenCalledTimes(1)
  })

  it('отчёт без ника основного список всё равно перезагружает', async () => {
    const wrapper = await mountView()
    apiService.getUsers.mockClear()

    // Учётки уже удалены: падение обработчика тут стоит дороже пустого ника
    wrapper.findComponent(UserMergeDialog).vm.$emit('merged', {
      report: { status: 'failed' },
      target: { id: 'user-1', nickname: 'Батон' },
      sources: [{ id: 'user-2', nickname: 'Батон-дубль' }]
    })
    await flushPromises()

    expect(apiService.getUsers).toHaveBeenCalledTimes(1)
  })
})
