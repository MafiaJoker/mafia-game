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
    
    // Флаг для предотвращения множественных запросов
    const isLoadingUser = ref(false)
    
    // Кеш последней проверки пользователя
    let lastUserCheckTime = 0
    const USER_CHECK_CACHE_MS = 5000 // 5 секунд кеш
    
    // Флаг инициализации
    const isInitialized = ref(false)
    
    // Загрузка текущего пользователя
    const loadCurrentUser = async () => {
        const now = Date.now()
        
        // Предотвращаем множественные одновременные запросы
        if (isLoadingUser.value) {
            console.log('User loading already in progress, skipping...')
            return { success: false, error: 'Loading in progress' }
        }
        
        // Проверяем кеш - если недавно проверяли пользователя, не запрашиваем снова
        if (now - lastUserCheckTime < USER_CHECK_CACHE_MS) {
            console.log('User check cached, returning current state')
            return { 
                success: !!user.value, 
                user: user.value, 
                cached: true,
                status: user.value ? 200 : 401
            }
        }
        
        isLoadingUser.value = true
        loading.value = true
        error.value = null
        
        try {
            const userData = await apiService.getCurrentUser()
            user.value = userData
            lastUserCheckTime = now // Обновляем время последней проверки
            isInitialized.value = true // Помечаем как инициализированный
            console.log('Current user loaded:', userData)
            return { success: true, user: userData }
        } catch (err) {
            lastUserCheckTime = now // Обновляем время даже при ошибке, чтобы не спамить
            
            // Если ошибка 401, значит пользователь не авторизован
            if (err.response?.status === 401) {
                user.value = null
                console.log('User not authenticated (401)')
                return { success: false, error: 'Not authenticated', status: 401 }
            }
            
            // Если API вернул HTML вместо JSON (сервер недоступен)
            if (err.message?.includes('HTML instead of JSON')) {
                console.log('API server unavailable (returned HTML)')
                user.value = null
                return { success: false, error: 'API server unavailable', status: 503 }
            }
            
            error.value = err.response?.data?.detail || 'Ошибка загрузки пользователя'
            console.error('Load current user error:', err)
            return { success: false, error: error.value }
        } finally {
            loading.value = false
            isLoadingUser.value = false
            isInitialized.value = true // Помечаем как инициализированный даже при ошибке
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

    // Авторизация через сайт в Electron
    const telegramLoginElectron = async (loginUrl = 'https://dev.jokermafia.am/login') => {
        loading.value = true
        error.value = null
        
        try {
            console.log('Starting site-based auth in Electron')
            
            // Проверяем, что мы в Electron
            if (!window.electronAPI) {
                loading.value = false
                throw new Error('Electron API not available')
            }
            
            // Открываем встроенное окно авторизации
            const authResult = await window.electronAPI.openTelegramOAuth(loginUrl)
            
            if (!authResult.success) {
                loading.value = false
                throw new Error(authResult.error || 'Failed to open login page')
            }
            
            // Слушаем callback об успешной авторизации
            return new Promise((resolve, reject) => {
                // Устанавливаем timeout
                const timeout = setTimeout(() => {
                    loading.value = false
                    reject(new Error('Authorization timeout - please try again'))
                }, 300000) // 5 минут
                
                // Обработчик успешной авторизации
                window.electronAPI.onAuthSuccessCallback(async (callbackData) => {
                    clearTimeout(timeout)
                    
                    try {
                        console.log('Received auth success callback with cookies:', callbackData)
                        
                        // Куки уже переданы в основную сессию Electron
                        // Небольшая задержка для обеспечения правильной установки куки
                        await new Promise(resolve => setTimeout(resolve, 1000))
                        
                        // Пытаемся загрузить данные пользователя
                        const userResult = await loadCurrentUser()
                        
                        loading.value = false
                        
                        if (userResult.success) {
                            console.log('Successfully authenticated via site with session sharing')
                            resolve({ success: true })
                        } else {
                            console.warn('Auth completed but user data not available:', userResult.error)
                            
                            // Если куки есть, но пользователь не загружается, возможно нужна перезагрузка
                            if (callbackData.hasSession) {
                                console.log('Session cookie detected, but API call failed. Trying again in 2 seconds...')
                                
                                // Повторная попытка через 2 секунды
                                setTimeout(async () => {
                                    try {
                                        const retryResult = await loadCurrentUser()
                                        if (retryResult.success) {
                                            console.log('Successfully authenticated on retry')
                                            loading.value = false
                                            resolve({ success: true })
                                            return
                                        }
                                    } catch (retryError) {
                                        console.error('Retry failed:', retryError)
                                    }
                                    
                                    // Если повторная попытка не удалась, перезагружаем приложение
                                    console.log('Retry failed, reloading app...')
                                    loading.value = false
                                    window.location.reload()
                                }, 2000)
                                
                                // Не резолвим сразу, ждем результата повторной попытки
                                return
                            } else {
                                resolve({ success: false, error: 'Authentication completed but session not available in app.' })
                            }
                        }
                        
                    } catch (err) {
                        console.error('Auth success callback error:', err)
                        loading.value = false
                        reject(err)
                    }
                })
                
                // Если результат уже получен синхронно (окно закрыто с ошибкой)
                if (authResult.error) {
                    clearTimeout(timeout)
                    loading.value = false
                    reject(new Error(authResult.error))
                }
            })
            
        } catch (err) {
            error.value = err.message || 'Ошибка авторизации через сайт'
            console.error('Site auth error:', err)
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
        isInitialized,
        
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