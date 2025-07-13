import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService } from '@/services/api.js'

export const useEventTypesStore = defineStore('eventTypes', () => {
    const eventTypes = ref([])
    const loading = ref(false)
    const currentEventType = ref(null)

    const sortedEventTypes = computed(() => {
        return [...eventTypes.value].sort((a, b) => a.label.localeCompare(b.label))
    })

    const loadEventTypes = async () => {
        // Предотвращаем множественные запросы
        if (loading.value) return
        
        loading.value = true
        try {
            const response = await apiService.getEventTypes()
            // Нормализация ответа API (аналогично events store)
            if (Array.isArray(response)) {
                eventTypes.value = response
            } else if (response && Array.isArray(response.items)) {
                eventTypes.value = response.items
            } else if (response && Array.isArray(response.data)) {
                eventTypes.value = response.data
            } else {
                console.warn('API returned unexpected event types structure:', response)
                eventTypes.value = []
            }
        } catch (error) {
            console.error('Ошибка загрузки типов событий:', error)
            eventTypes.value = []
            
            // Не выбрасываем ошибку для прерванных запросов и ошибок авторизации
            if (error.code === 'ECONNABORTED' || error.response?.status === 401) {
                console.warn('Запрос прерван или требуется авторизация')
                return
            }
            
            throw error
        } finally {
            loading.value = false
        }
    }

    const getEventTypeById = (eventTypeId) => {
        return Array.isArray(eventTypes.value) ? eventTypes.value.find(type => type.id === eventTypeId) : null
    }

    const createEventType = async (eventTypeData) => {
        try {
            const newEventType = await apiService.createEventType(eventTypeData)
            if (Array.isArray(eventTypes.value)) {
                eventTypes.value.push(newEventType)
            }
            return newEventType
        } catch (error) {
            console.error('Ошибка создания типа события:', error)
            throw error
        }
    }

    const updateEventType = async (eventTypeId, eventTypeData) => {
        try {
            const updatedEventType = await apiService.updateEventType(eventTypeId, eventTypeData)
            if (Array.isArray(eventTypes.value)) {
                const index = eventTypes.value.findIndex(type => type.id === eventTypeId)
                if (index !== -1) {
                    eventTypes.value[index] = updatedEventType
                }
            }
            return updatedEventType
        } catch (error) {
            console.error('Ошибка обновления типа события:', error)
            throw error
        }
    }

    const deleteEventType = async (eventTypeId) => {
        try {
            await apiService.deleteEventType(eventTypeId)
            if (Array.isArray(eventTypes.value)) {
                eventTypes.value = eventTypes.value.filter(type => type.id !== eventTypeId)
            }
            return true
        } catch (error) {
            console.error('Ошибка удаления типа события:', error)
            return false
        }
    }

    return {
        eventTypes,
        loading,
        currentEventType,
        sortedEventTypes,
        loadEventTypes,
        getEventTypeById,
        createEventType,
        updateEventType,
        deleteEventType
    }
})