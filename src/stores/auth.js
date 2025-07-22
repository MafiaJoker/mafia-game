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
    const userRole = computed(() => user.value?.roles?.[0] || 'guest')
    const userName = computed(() => user.value?.nickname || 'Unknown User')
    const isAdmin = computed(() => userRole.value === 'admin')
    const isJudge = computed(() => userRole.value === 'judge') 
    const isPlayer = computed(() => userRole.value === 'player')

    // Actions
    
    // Загрузка текущего пользователя
    const loadCurrentUser = async () => {
        loading.value = true
        error.value = null
        
        try {
            const userData = await apiService.getCurrentUser()
            user.value = userData
            console.log('Current user loaded:', userData)
            return { success: true, user: userData }
        } catch (err) {
            // Если ошибка 401, значит пользователь не авторизован
            if (err.response?.status === 401) {
                user.value = null
                console.log('User not authenticated')
                return { success: false, error: 'Not authenticated', status: 401 }
            }
            
            error.value = err.response?.data?.detail || 'Ошибка загрузки пользователя'
            console.error('Load current user error:', err)
            return { success: false, error: error.value }
        } finally {
            loading.value = false
        }
    }

    // Авторизация через Telegram
    const telegramLogin = async (telegramData) => {
        loading.value = true
        error.value = null
        
        try {
            // Отправляем данные Telegram на сервер для авторизации
            const response = await apiService.telegramLogin(telegramData)
            
            // После успешной авторизации загружаем данные пользователя
            const result = await loadCurrentUser()
            
            if (result.success) {
                console.log('Telegram user logged in successfully')
                return { success: true }
            } else {
                return { success: false, error: 'Failed to load user data after login' }
            }
        } catch (err) {
            error.value = err.response?.data?.detail || 'Ошибка авторизации через Telegram'
            console.error('Telegram login error:', err)
            return { success: false, error: error.value }
        } finally {
            loading.value = false
        }
    }

    // Авторизация через Telegram в Electron (OAuth flow)
    const telegramLoginElectron = async (botUsername, authUrl) => {
        loading.value = true
        error.value = null
        
        try {
            console.log('Starting Telegram OAuth in Electron')
            
            // Проверяем, что мы в Electron
            if (!window.electronAPI) {
                loading.value = false
                throw new Error('Electron API not available')
            }
            
            // Запускаем OAuth процесс
            const result = await window.electronAPI.openTelegramOAuth(botUsername, authUrl)
            
            if (!result.success) {
                loading.value = false
                throw new Error(result.error || 'Failed to start OAuth')
            }
            
            // Возвращаем промис, который будет resolved когда получим callback
            return new Promise((resolve, reject) => {
                // Устанавливаем timeout
                const timeout = setTimeout(() => {
                    loading.value = false
                    reject(new Error('OAuth timeout'))
                }, 300000) // 5 минут
                
                // Слушаем OAuth callback
                window.electronAPI.onTelegramOAuthCallback(async (callbackData) => {
                    clearTimeout(timeout)
                    
                    try {
                        console.log('Received OAuth callback data:', callbackData)
                        
                        // Преобразуем данные для API
                        const telegramData = {
                            telegram_id: callbackData.id || callbackData.telegram_id,
                            first_name: callbackData.first_name || null,
                            last_name: callbackData.last_name || null,
                            nickname: callbackData.username || callbackData.nickname || null,
                            photo_url: callbackData.photo_url || null,
                            auth_date: callbackData.auth_date || null,
                            hash: callbackData.hash
                        }
                        
                        // Убираем undefined значения
                        Object.keys(telegramData).forEach(key => {
                            if (telegramData[key] === undefined) {
                                telegramData[key] = null
                            }
                        })
                        
                        console.log('Sending OAuth data to API:', telegramData)
                        
                        // Используем обычный телеграм логин с полученными данными
                        const loginResult = await telegramLogin(telegramData)
                        loading.value = false
                        resolve(loginResult)
                        
                    } catch (err) {
                        console.error('OAuth callback error:', err)
                        loading.value = false
                        reject(err)
                    }
                })
            })
            
        } catch (err) {
            error.value = err.message || 'Ошибка OAuth авторизации через Telegram'
            console.error('Telegram OAuth error:', err)
            loading.value = false
            return { success: false, error: error.value }
        }
    }

    // Авторизация тестового пользователя
    const testUserLogin = async () => {
        loading.value = true
        error.value = null
        
        try {
            // Отправляем запрос на авторизацию тестового пользователя
            const response = await apiService.testUserLogin()
            
            // После успешной авторизации загружаем данные пользователя
            const result = await loadCurrentUser()
            
            if (result.success) {
                console.log('Test user logged in successfully')
                return { success: true }
            } else {
                return { success: false, error: 'Failed to load user data after login' }
            }
        } catch (err) {
            error.value = err.response?.data?.detail || 'Ошибка авторизации тестового пользователя'
            console.error('Test user login error:', err)
            return { success: false, error: error.value }
        } finally {
            loading.value = false
        }
    }


    // Выход из системы
    const logout = async () => {
        loading.value = true
        
        try {
            // Вызываем API для выхода из системы (удаляем куку)
            await apiService.logout()
            console.log('Logged out from server')
        } catch (err) {
            console.error('Logout error:', err)
        }
        
        // Очищаем локальное состояние
        user.value = null
        error.value = null
        loading.value = false
        
        // Перенаправляем на страницу входа
        router.push('/login')
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

    // Проверка прав доступа
    const hasPermission = (permission) => {
        if (!user.value) return false
        
        const permissions = {
            admin: ['admin'],
            judge: ['admin', 'judge'],
            player: ['admin', 'judge', 'player']
        }
        
        const allowedRoles = permissions[permission] || []
        return allowedRoles.includes(user.value.role || 'guest')
    }

    return {
        // State
        user,
        loading,
        error,
        
        // Getters
        isAuthenticated,
        userRole,
        userName,
        isAdmin,
        isJudge,
        isPlayer,
        
        // Actions
        loadCurrentUser,
        telegramLogin,
        telegramLoginElectron,
        testUserLogin,
        logout,
        checkAuth,
        updateProfile,
        hasPermission
    }
})