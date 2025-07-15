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
	path: '/game',
	name: 'Game',
	component: () => import('@/views/GameView.vue'),
	props: route => ({
	    eventId: parseInt(route.query.eventId),
	    tableId: parseInt(route.query.tableId),
	    gameId: parseInt(route.query.gameId)
	})
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
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Настройка гарда для проверки авторизации
router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    
    // Если пользователь идет на страницу авторизации, пропускаем
    if (to.path === '/login') {
        next()
        return
    }
    
    // Проверяем авторизацию пользователя
    if (!authStore.isAuthenticated) {
        // Пытаемся загрузить текущего пользователя только если переходим не со страницы логина
        // (чтобы избежать автоматического создания сессии)
        if (from.path !== '/login') {
            const result = await authStore.loadCurrentUser()
            
            if (result.success) {
                next()
                return
            }
        }
        
        // Если не удалось загрузить пользователя, редиректим на логин
        next('/login')
        return
    }
    
    next()
})

// Заглушка для совместимости с main.js
export function setupAuthGuard() {
    // Ничего не делаем
}

export default router