import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService } from '@/services/api.js'

export const useEventsStore = defineStore('events', () => {
    const events = ref([])
    const currentEvent = ref(null)
    const loading = ref(false)

    const activeEvents = computed(() => {
	return events.value.filter(event => event.status !== 'completed')
    })

    const archivedEvents = computed(() => {
	return events.value.filter(event => event.status === 'completed')
    })

    const loadEvents = async () => {
	loading.value = true
	try {
	    events.value = await apiService.getEvents()
	} catch (error) {
	    console.error('Ошибка загрузки мероприятий:', error)
	    throw error
	} finally {
	    loading.value = false
	}
    }

    const getEventById = (eventId) => {
	return events.value.find(event => event.id === eventId)
    }

    const createEvent = async (eventData) => {
	try {
	    const newEvent = await apiService.createEvent(eventData)
	    events.value.push(newEvent)
	    return newEvent
	} catch (error) {
	    console.error('Ошибка создания мероприятия:', error)
	    throw error
	}
    }

    const updateEvent = async (eventId, eventData) => {
	try {
	    const updatedEvent = await apiService.updateEvent(eventId, eventData)
	    const index = events.value.findIndex(e => e.id === eventId)
	    if (index !== -1) {
		events.value[index] = updatedEvent
	    }
	    return updatedEvent
	} catch (error) {
	    console.error('Ошибка обновления мероприятия:', error)
	    throw error
	}
    }

    const deleteEvent = async (eventId) => {
	try {
	    await apiService.deleteEvent(eventId)
	    events.value = events.value.filter(e => e.id !== eventId)
	    return true
	} catch (error) {
	    console.error('Ошибка удаления мероприятия:', error)
	    return false
	}
    }

    return {
	events,
	currentEvent,
	loading,
	activeEvents,
	archivedEvents,
	loadEvents,
	getEventById,
	createEvent,
	updateEvent,
	deleteEvent
    }
})
