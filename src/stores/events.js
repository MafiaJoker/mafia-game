import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService } from '@/services/api.js'

export const useEventsStore = defineStore('events', () => {
    const events = ref([])
    const currentEvent = ref(null)
    const loading = ref(false)

    const activeEvents = computed(() => {
	return Array.isArray(events.value) ? events.value : []
    })

    const archivedEvents = computed(() => {
	return []
    })

    const loadEvents = async () => {
	loading.value = true
	try {
	    const response = await apiService.getEvents()
	    // Проверяем структуру ответа и нормализуем данные
	    if (Array.isArray(response)) {
		events.value = response
	    } else if (response && Array.isArray(response.items)) {
		events.value = response.items
	    } else if (response && Array.isArray(response.data)) {
		events.value = response.data
	    } else if (response && Array.isArray(response.events)) {
		events.value = response.events
	    } else {
		console.warn('API returned unexpected events structure:', response)
		events.value = []
	    }
	} catch (error) {
	    console.error('Ошибка загрузки мероприятий:', error)
	    events.value = [] // Обнуляем при ошибке
	    throw error
	} finally {
	    loading.value = false
	}
    }

    const getEventById = (eventId) => {
	return Array.isArray(events.value) ? events.value.find(event => event.id === eventId) : null
    }

    const createEvent = async (eventData) => {
	try {
	    const newEvent = await apiService.createEvent(eventData)
	    // Добавляем событие в массив только после успешного ответа от сервера
	    if (newEvent && newEvent.id) {
		events.value.push(newEvent)
	    }
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
	    if (Array.isArray(events.value)) {
		events.value = events.value.filter(e => e.id !== eventId)
	    }
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
