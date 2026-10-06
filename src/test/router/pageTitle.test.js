// Заголовок вкладки: у рассадки свой, под поиск, у остальных страниц -
// общий, как в index.html. Уход с рассадки возвращает общий

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import { apiService } from '@/services/api'
import { APP_TITLE } from '@/utils/constants.js'
import { SEATING_PAGE_TITLE } from '@/utils/seatingPage.js'

vi.mock('@/services/api', () => ({
  apiService: { getCurrentUser: vi.fn() },
  initApiUrl: vi.fn()
}))

// Сами экраны заголовку не нужны - подменяем их пустышками
vi.mock('@/views/SeatingView.vue', () => ({ default: { render: () => null } }))
vi.mock('@/views/LoginView.vue', () => ({ default: { render: () => null } }))

describe('роутер: заголовок вкладки', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    // Проверка сессии при старте уже прошла: пользователя нет
    useAuthStore().isInitialized = true
    apiService.getCurrentUser.mockRejectedValue({ response: { status: 401 } })
    await router.replace('/login')
  })

  it('у рассадки и рассадки по ссылке - свой заголовок', async () => {
    await router.push('/seating')
    expect(document.title).toBe(SEATING_PAGE_TITLE)

    await router.push('/seating/7b2f7c8e-0a51-4c0e-9d0e-4a3e4c1f5b21')
    expect(document.title).toBe(SEATING_PAGE_TITLE)
  })

  it('уход с рассадки возвращает общий заголовок', async () => {
    await router.push('/seating')

    await router.push('/login')

    expect(document.title).toBe(APP_TITLE)
  })
})
