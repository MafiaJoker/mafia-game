import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiService } from '@/services/api.js'

export const useEventTypesStore = defineStore('eventTypes', () => {
    const eventTypes = ref([])
    const loading = ref(false)

    const loadEventTypes = async () => {
        // Предотвращаем множественные запросы
        if (loading.value) return

        loading.value = true
        try {
            const response = await apiService.getEventTypes()

            // Проверяем, что response не является HTML
            if (typeof response === 'string' && response.includes('<!DOCTYPE html>')) {
                console.error('API returned HTML page instead of JSON data')
                console.log('This usually means the API server is not running or misconfigured')
                eventTypes.value = []
                return
            }

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

    return {
        eventTypes,
        loading,
        loadEventTypes
    }
})
