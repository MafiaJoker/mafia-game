import { createRouter, createWebHistory } from 'vue-router'

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
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Заглушка для совместимости с main.js
export function setupAuthGuard() {
    // Ничего не делаем
}

export default router