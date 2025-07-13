import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService } from '@/services/api.js'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
    // State
    const user = ref(null)
    const token = ref(localStorage.getItem('auth_token') || null)
    const loading = ref(false)
    const error = ref(null)

    // Getters
    const isAuthenticated = computed(() => !!token.value && !!user.value)
    const userRole = computed(() => user.value?.role || 'guest')
    const isAdmin = computed(() => userRole.value === 'admin')
    const isJudge = computed(() => userRole.value === 'judge')
    const isPlayer = computed(() => userRole.value === 'player')

    // Actions
    const login = async (credentials) => {
        loading.value = true
        error.value = null
        
        try {
            const response = await apiService.login(credentials)
            
            // Сохраняем токен
            token.value = response.token
            localStorage.setItem('auth_token', response.token)
            
            // Устанавливаем токен в API сервис
            apiService.setAuthToken(response.token)
            
            // Сохраняем пользователя
            user.value = response.user
            
            // Перенаправляем на главную
            router.push('/')
            
            return { success: true }
        } catch (err) {
            error.value = err.response?.data?.message || 'Ошибка входа'
            return { success: false, error: error.value }
        } finally {
            loading.value = false
        }
    }

    const register = async (userData) => {
        loading.value = true
        error.value = null
        
        try {
            const response = await apiService.register(userData)
            
            // После регистрации сразу логиним
            if (response.token) {
                token.value = response.token
                localStorage.setItem('auth_token', response.token)
                apiService.setAuthToken(response.token)
                user.value = response.user
                
                router.push('/')
                return { success: true }
            }
            
            // Если токен не вернулся, перенаправляем на страницу входа
            router.push('/login')
            return { success: true, message: 'Регистрация успешна! Войдите в систему.' }
            
        } catch (err) {
            error.value = err.response?.data?.message || 'Ошибка регистрации'
            return { success: false, error: error.value }
        } finally {
            loading.value = false
        }
    }

    const logout = async () => {
        try {
            // Отправляем запрос на сервер (опционально)
            await apiService.logout().catch(() => {})
        } finally {
            // Очищаем локальные данные
            token.value = null
            user.value = null
            localStorage.removeItem('auth_token')
            
            // Очищаем токен в API сервисе
            apiService.setAuthToken(null)
            
            // Перенаправляем на страницу входа
            router.push('/login')
        }
    }

    const fetchUser = async () => {
        if (!token.value) return
        
        loading.value = true
        try {
            // Устанавливаем токен перед запросом
            apiService.setAuthToken(token.value)
            
            const response = await apiService.getCurrentUser()
            user.value = response
        } catch (err) {
            // Если токен невалидный, очищаем данные
            if (err.response?.status === 401) {
                await logout()
            }
        } finally {
            loading.value = false
        }
    }

    const updateProfile = async (profileData) => {
        loading.value = true
        error.value = null
        
        try {
            const response = await apiService.updateProfile(profileData)
            user.value = response
            return { success: true }
        } catch (err) {
            error.value = err.response?.data?.message || 'Ошибка обновления профиля'
            return { success: false, error: error.value }
        } finally {
            loading.value = false
        }
    }

    const changePassword = async (passwordData) => {
        loading.value = true
        error.value = null
        
        try {
            await apiService.changePassword(passwordData)
            return { success: true, message: 'Пароль успешно изменен' }
        } catch (err) {
            error.value = err.response?.data?.message || 'Ошибка изменения пароля'
            return { success: false, error: error.value }
        } finally {
            loading.value = false
        }
    }

    // Инициализация при загрузке
    const initialize = async () => {
        if (token.value) {
            try {
                await fetchUser()
            } catch (error) {
                // Если ошибка при получении пользователя, очищаем токен
                console.warn('Ошибка инициализации auth:', error)
                token.value = null
                user.value = null
                localStorage.removeItem('auth_token')
            }
        }
    }

    return {
        // State
        user,
        token,
        loading,
        error,
        
        // Getters
        isAuthenticated,
        userRole,
        isAdmin,
        isJudge,
        isPlayer,
        
        // Actions
        login,
        register,
        logout,
        fetchUser,
        updateProfile,
        changePassword,
        initialize
    }
})