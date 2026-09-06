// Профиль игрока: на странице только то, что действительно можно изменить -
// ник, игровые аватарки и настройка, если сервер ее отдал

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ProfileView from '@/views/ProfileView.vue'
import UserAvatarsEditor from '@/components/users/UserAvatarsEditor.vue'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/services/api', () => ({
  apiService: {
    getCurrentUser: vi.fn(),
    updateCurrentUser: vi.fn(),
    uploadMyAvatar: vi.fn(),
    deleteMyAvatar: vi.fn()
  },
  initApiUrl: vi.fn()
}))

vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

const currentUser = (overrides = {}) => ({
  id: 'user-1',
  nickname: 'Батон',
  roles: ['player', 'game_master'],
  telegram: { id: 123456 },
  settings: { gather_extended_data: null },
  avatars: [{ role: 'civilian', avatar_url: 'https://cdn/civilian.webp' }],
  ...overrides
})

const mountProfile = (user = currentUser()) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.user = user
  const wrapper = mount(ProfileView, { global: { plugins: [pinia] } })
  return { wrapper, authStore }
}

describe('ProfileView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('показывает ник, роли и telegram id', () => {
    const { wrapper } = mountProfile()

    expect(wrapper.text()).toContain('Батон')
    expect(wrapper.text()).toContain('Игрок')
    expect(wrapper.text()).toContain('Ведущий')
    expect(wrapper.text()).toContain('123456')
  })

  it('отдает блоку аватарок свои картинки', () => {
    const { wrapper } = mountProfile()
    const editor = wrapper.findComponent(UserAvatarsEditor)

    expect(editor.props('target')).toBe('me')
    expect(editor.props('avatars')).toEqual([
      { role: 'civilian', avatar_url: 'https://cdn/civilian.webp' }
    ])
  })

  it('кладет загруженные аватарки в стор, чтобы страница не перезагружалась', async () => {
    const { wrapper, authStore } = mountProfile()
    const updated = [
      { role: 'civilian', avatar_url: 'https://cdn/civilian.webp' },
      { role: 'mafia', avatar_url: 'https://cdn/mafia.webp' }
    ]

    wrapper.findComponent(UserAvatarsEditor).vm.$emit('update:avatars', updated)
    await flushPromises()

    expect(authStore.user.avatars).toEqual(updated)
  })

  it('без изменений ник не сохраняет', () => {
    const { wrapper } = mountProfile()

    const button = wrapper.find('[data-testid="profile-nickname-save"]')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('сохраняет новый ник', async () => {
    const { wrapper, authStore } = mountProfile()
    const updateProfile = vi.spyOn(authStore, 'updateProfile')
      .mockResolvedValue({ success: true })

    await wrapper.find('[data-testid="profile-nickname-input"]').setValue('Новый ник')
    await wrapper.find('[data-testid="profile-nickname-save"]').trigger('click')
    await flushPromises()

    expect(updateProfile).toHaveBeenCalledWith({ nickname: 'Новый ник' })
  })

  it('пустой ник на сервер не уходит', async () => {
    const { wrapper, authStore } = mountProfile()
    const updateProfile = vi.spyOn(authStore, 'updateProfile')

    await wrapper.find('[data-testid="profile-nickname-input"]').setValue('   ')
    await wrapper.find('[data-testid="profile-nickname-save"]').trigger('click')
    await flushPromises()

    expect(updateProfile).not.toHaveBeenCalled()
    // Текст ошибки Element Plus рисует внутри transition, в тестах он
    // не разворачивается - проверяем состояние поля
    expect(wrapper.find('.el-form-item').classes()).toContain('is-error')
  })

  it('настройку показывает только тем, кому ее отдал сервер', () => {
    const { wrapper } = mountProfile()
    expect(wrapper.find('[data-testid="profile-extended-data-switch"]').exists()).toBe(false)

    const withSetting = mountProfile(currentUser({
      settings: {
        gather_extended_data: { value: false, description: 'расширенная статистика' }
      }
    }))
    expect(withSetting.wrapper.text()).toContain('расширенная статистика')
    expect(
      withSetting.wrapper.find('[data-testid="profile-extended-data-switch"]').exists()
    ).toBe(true)
  })

  it('переключатель настройки возвращается назад, если сервер ее не принял', async () => {
    const { wrapper, authStore } = mountProfile(currentUser({
      settings: {
        gather_extended_data: { value: false, description: 'расширенная статистика' }
      }
    }))
    vi.spyOn(authStore, 'updateProfile').mockResolvedValue({ success: false, status: 403 })

    await wrapper.find('[data-testid="profile-extended-data-switch"] input').setValue(true)
    await flushPromises()

    expect(authStore.updateProfile).toHaveBeenCalledWith({
      settings: { gather_extended_data: true }
    })
    expect(wrapper.find('[data-testid="profile-extended-data-switch"]').classes())
      .not.toContain('is-checked')
  })
})
