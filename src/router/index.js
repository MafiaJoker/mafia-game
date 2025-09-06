import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
    {
	path: '/test',
	name: 'Test',
	component: () => import('@/views/TestView.vue')
    },
    {
	path: '/login',
	name: 'Login',
	component: () => import('@/views/LoginView.vue')
    },
    {
	path: '/',
	name: 'Events',
	component: () => import('@/views/EventsView.vue')
    },
    {
	path: '/event/:id',
	name: 'Event',
	component: () => import('@/views/EventView.vue'),
	props: true
    },
    {
	path: '/game/:id',
	name: 'Game',
	component: () => import('@/views/GameView.vue'),
	props: true
    },
    {
	path: '/game/:id/results',
	name: 'GameResults',
	component: () => import('@/views/GameResultsView.vue'),
	props: true
    },
    {
	path: '/event-types',
	name: 'EventTypes',
	component: () => import('@/views/EventTypesView.vue')
    },
    {
	path: '/profile',
	name: 'Profile',
	component: () => import('@/views/ProfileView.vue')
    },
    {
	path: '/users',
	name: 'Users',
	component: () => import('@/views/UsersView.vue'),
	meta: { requiresAdmin: true }
    },
    {
	path: '/tariffs',
	name: 'Tariffs',
	component: () => import('@/views/TariffsView.vue')
    },
    {
	path: '/calendar',
	name: 'EventsCalendar',
	component: () => import('@/views/EventsCalendarView.vue')
    },
    {
	path: '/event/:id/register',
	name: 'EventRegistration',
	component: () => import('@/views/EventRegistrationView.vue'),
	props: true
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Флаг для предотвращения множественных проверок авторизации
let authCheckInProgress = false

// Настройка гарда для проверки авторизации
router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    
    // Логируем только если это не повторная навигация на ту же страницу
    if (to.path !== from.path) {
        console.log(`Router: navigating from ${from.path} to ${to.path}`)
    }
    
    // Если пользователь идет на страницу авторизации, пропускаем
    if (to.path === '/login') {
        console.log('Router: going to login page, allowing navigation')
        next()
        return
    }
    
    // Дождемся завершения инициализации авторизации при первом запуске
    if (window.__authInitPromise) {
        console.log('Router: waiting for initial auth check to complete...')
        try {
            await window.__authInitPromise
            console.log('Router: initial auth check completed')
        } catch (error) {
            console.log('Router: initial auth check failed:', error)
        }
        // Очищаем Promise после первого использования
        delete window.__authInitPromise
    }
    
    // Если проверка уже идет, ждем завершения
    if (authCheckInProgress) {
        console.log('Router: auth check in progress, waiting...')
        // Ждем завершения текущей проверки
        let attempts = 0
        const maxAttempts = 50 // 5 seconds max
        while (authCheckInProgress && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100))
            attempts++
        }
        console.log('Router: auth check completed, continuing...')
    }
    
    // Проверяем авторизацию пользователя
    if (!authStore.isAuthenticated) {
        // Если store еще не инициализирован, ждем инициализации
        if (!authStore.isInitialized) {
            console.log('Router: auth store not initialized yet, waiting for initialization...')
            let attempts = 0
            const maxAttempts = 20 // 2 seconds max
            while (!authStore.isInitialized && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100))
                attempts++
            }
            // После инициализации проверяем снова
            if (!authStore.isInitialized) {
                console.log('Router: auth store initialization timeout, allowing navigation')
                next()
                return
            }
            // Проверяем авторизацию снова после инициализации
            if (authStore.isAuthenticated) {
                console.log('Router: user authenticated after initialization, continuing navigation')
                next()
                return
            }
        }
        
        console.log('Router: user not authenticated, checking with API...')
        
        // Пытаемся загрузить текущего пользователя только если переходим не со страницы логина
        if (from.path !== '/login') {
            authCheckInProgress = true
            const result = await authStore.loadCurrentUser()
            authCheckInProgress = false
            
            if (result.success) {
                console.log('Router: user loaded successfully, continuing navigation')
                next()
                return
            }
            
            // Если результат закеширован и пользователя нет, сразу редиректим
            if (result.cached && !result.success) {
                console.log('Router: cached negative result, redirecting to login')
                next('/login')
                return
            }
            
            // Если получили 401, значит сессия недействительна
            if (result.status === 401) {
                console.log('Router: session expired (401), redirecting to login')
                next('/login')
                return
            }
            
            // Если API недоступен (503), не редиректим - может быть временная проблема
            if (result.status === 503) {
                console.log('Router: API unavailable (503), allowing navigation without auth')
                next()
                return
            }
        }
        
        // Если не удалось загрузить пользователя, редиректим на логин
        console.log('Router: could not load user, redirecting to login')
        next('/login')
        return
    }
    
    console.log('Router: user authenticated, continuing navigation')
    next()
})

// Заглушка для совместимости с main.js
export function setupAuthGuard() {
    // Ничего не делаем
}

export default router