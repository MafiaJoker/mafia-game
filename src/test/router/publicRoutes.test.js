// Публичные страницы роутера: гард пропускает без входа все, у чего
// meta.public, - вход, плашки OBS и рассадку. Остальное без сессии
// по-прежнему уводит на /login

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: { getCurrentUser: vi.fn() },
  initApiUrl: vi.fn()
}))

// Сами экраны гарду не нужны - подменяем их пустышками, чтобы переход
// не тянул за собой страницы целиком
vi.mock('@/views/SeatingView.vue', () => ({ default: { render: () => null } }))
vi.mock('@/views/LoginView.vue', () => ({ default: { render: () => null } }))
vi.mock('@/views/RatingsView.vue', () => ({ default: { render: () => null } }))

const routeMeta = (name) => router.getRoutes().find(route => route.name === name)?.meta

describe('роутер: публичные страницы', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    // Проверка сессии при старте уже прошла: пользователя нет
    useAuthStore().isInitialized = true
    apiService.getCurrentUser.mockRejectedValue({ response: { status: 401 } })
    await router.replace('/login')
  })

  it.each(['Login', 'GameDies', 'EventDies', 'Seating'])('%s открывается без входа', (name) => {
    expect(routeMeta(name)?.public).toBe(true)
  })

  it('аноним открывает рассадку и рассадку по ссылке, на вход его не уводит', async () => {
    await router.push('/seating')
    expect(router.currentRoute.value.fullPath).toBe('/seating')

    await router.push('/seating/7b2f7c8e-0a51-4c0e-9d0e-4a3e4c1f5b21')
    expect(router.currentRoute.value.name).toBe('Seating')
  })

  it('закрытая страница без сессии по-прежнему уводит на вход', async () => {
    await router.push('/seating')

    await router.push('/ratings')

    expect(router.currentRoute.value.fullPath).toBe('/login')
  })
})
