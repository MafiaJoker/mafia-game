import { createRouter, createWebHistory } from 'vue-router'

const routes = [
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
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
