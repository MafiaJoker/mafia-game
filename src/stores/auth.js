import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService } from '@/services/api.js'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
    // State
    const user = ref(null)
    const loading = ref(false)
    const error = ref(null)

    // Getters
    const isAuthenticated = computed(() => !!user.value)
    const userRole = computed(() => user.value?.role || 'guest')
    const isAdmin = computed(() => userRole.value === 'admin')
    const isJudge = computed(() => userRole.value === 'judge') 
    const isPlayer = computed(() => userRole.value === 'player')

    // Actions
    
    // Авторизация через Telegram
    const telegramLogin = async (telegramData) => {
        loading.value = true
        error.value = null
        
        try {
            // Отправляем данные Telegram на сервер для авторизации
            const response = await apiService.telegramLogin(telegramData)
            
            // При успешной авторизации сохраняем данные пользователя из Telegram
            user.value = {
                telegram_id: telegramData.telegram_id,
                first_name: telegramData.first_name,
                last_name: telegramData.last_name,
                nickname: telegramData.nickname,
                photo_url: telegramData.photo_url
            }
            
            console.log('User data saved:', user.value)
            
            return { success: true }
        } catch (err) {
            error.value = err.response?.data?.detail || 'Ошибка авторизации через Telegram'
            console.error('Telegram login error:', err)
            return { success: false, error: error.value }
        } finally {
            loading.value = false
        }
    }


    // Выход из системы
    const logout = async () => {
        loading.value = true
        
        try {
            await apiService.logout()
        } catch (err) {
            console.error('Logout error:', err)
        } finally {
            // Очищаем локальное состояние независимо от результата API
            user.value = null
            error.value = null
            loading.value = false
            
            // Перенаправляем на страницу входа
            router.push('/login')
        }
    }

    // Проверка аутентификации при запуске приложения
    const checkAuth = async () => {
        // В случае с сессионными cookie просто проверяем, есть ли пользователь
        return !!user.value
    }

    // Обновление профиля пользователя
    const updateProfile = async (profileData) => {
        loading.value = true
        error.value = null
        
        try {
            const response = await apiService.updateProfile(profileData)
            user.value = { ...user.value, ...response }
            return { success: true }
        } catch (err) {
            error.value = err.response?.data?.detail || 'Ошибка обновления профиля'
            return { success: false, error: error.value }
        } finally {
            loading.value = false
        }
    }

    return {
        // State
        user,
        loading,
        error,
        
        // Getters
        isAuthenticated,
        userRole,
        isAdmin,
        isJudge,
        isPlayer,
        
        // Actions
        telegramLogin,
        logout,
        checkAuth,
        updateProfile
    }
})