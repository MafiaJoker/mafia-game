import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService, initApiUrl } from '@/services/api.js'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
    // State
    const user = ref(null)
    const loading = ref(false)
    const error = ref(null)
    
    // Флаги для предотвращения множественных запросов
    const isLoadingUser = ref(false)
    const isLoggingIn = ref(false)

    // Getters
    const isAuthenticated = computed(() => !!user.value)
    const userRole = computed(() => user.value?.roles?.[0] || 'guest')
    const userName = computed(() => user.value?.nickname || 'Unknown User')
    const isAdmin = computed(() => userRole.value === 'admin')
    const isJudge = computed(() => userRole.value === 'judge') 
    const isPlayer = computed(() => userRole.value === 'player')

    // Actions
    
    // Кеш последней проверки пользователя
    let lastUserCheckTime = 0
    const USER_CHECK_CACHE_MS = 5000 // 5 секунд кеш
    
    // Флаг инициализации
    const isInitialized = ref(false)
    
    // Загрузка текущего пользователя
    const loadCurrentUser = async () => {
        // Дождемся инициализации API URL для Electron
        if (window.electronAPI) {
            await initApiUrl()
        }
        const now = Date.now()
        
        console.log('=== LoadCurrentUser Debug Info ===')
        console.log('Current domain:', window.location.hostname)
        console.log('Current protocol:', window.location.protocol)
        console.log('API Base URL:', window.electronAPI ? 'Electron mode' : import.meta.env.VITE_API_BASE_URL || 'default')
        console.log('Cookies available:', document.cookie)
        console.log('User agent:', navigator.userAgent)
        
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
            console.log('Making API call to getCurrentUser...')
            const userData = await apiService.getCurrentUser()
            user.value = userData
            lastUserCheckTime = now // Обновляем время последней проверки
            isInitialized.value = true // Помечаем как инициализированный
            console.log('✅ Current user loaded successfully:', userData)
            console.log('Session cookies after load:', document.cookie)
            return { success: true, user: userData }
        } catch (err) {
            lastUserCheckTime = now // Обновляем время даже при ошибке, чтобы не спамить
            
            console.error('❌ Load current user error details:', {
                status: err.response?.status,
                statusText: err.response?.statusText,
                headers: err.response?.headers,
                data: err.response?.data,
                message: err.message,
                cookies: document.cookie
            })
            
            // Если ошибка 401, значит пользователь не авторизован
            if (err.response?.status === 401) {
                user.value = null
                console.log('User not authenticated (401) - session expired or invalid')
                return { success: false, error: 'Not authenticated', status: 401 }
            }
            
            // Если API вернул HTML вместо JSON (сервер недоступен)
            if (err.message?.includes('HTML instead of JSON')) {
                console.log('API server unavailable (returned HTML)')
                user.value = null
                return { success: false, error: 'API server unavailable', status: 503 }
            }
            
            error.value = err.response?.data?.detail || 'Ошибка загрузки пользователя'
            console.error('General load current user error:', err)
            return { success: false, error: error.value }
        } finally {
            loading.value = false
            isLoadingUser.value = false
            isInitialized.value = true // Помечаем как инициализированный даже при ошибке
        }
    }

    // Авторизация через Telegram
    const telegramLogin = async (telegramData) => {
        // Предотвращаем множественные одновременные попытки авторизации через Telegram
        if (isLoggingIn.value) {
            console.log('Telegram login already in progress, skipping...')
            return { success: false, error: 'Login already in progress' }
        }

        isLoggingIn.value = true
        loading.value = true
        error.value = null
        
        try {
            console.log('Starting Telegram login...')
            
            // Отправляем данные Telegram на сервер для авторизации
            console.log('Cookies before Telegram API call:', document.cookie)
            const response = await apiService.telegramLogin(telegramData)
            console.log('Telegram login API response:', response)
            console.log('Cookies after Telegram API call:', document.cookie)
            
            // Небольшая задержка для установки cookies
            await new Promise(resolve => setTimeout(resolve, 1000)) // Увеличиваем задержку до 1 секунды
            
            // После успешной авторизации загружаем данные пользователя
            const result = await loadCurrentUser()
            
            if (result.success) {
                console.log('Telegram user logged in successfully')
                return { success: true }
            } else {
                console.error('Failed to load user after Telegram login:', result.error)
                return { success: false, error: result.error || 'Failed to load user data after login' }
            }
        } catch (err) {
            error.value = err.response?.data?.detail || 'Ошибка авторизации через Telegram'
            console.error('Telegram login error:', err)
            return { success: false, error: error.value }
        } finally {
            loading.value = false
            isLoggingIn.value = false
        }
    }

    // Авторизация через сайт в Electron
    const telegramLoginElectron = async (loginUrl = 'https://dev.jokermafia.am/login') => {
        // Предотвращаем множественные одновременные попытки авторизации
        if (isLoggingIn.value) {
            console.log('Electron login already in progress, skipping...')
            return { success: false, error: 'Login already in progress' }
        }

        // Дождемся инициализации API URL для Electron
        try {
            await initApiUrl()
        } catch (err) {
            console.error('Failed to initialize API URL:', err)
        }

        isLoggingIn.value = true
        loading.value = true
        error.value = null
        
        try {
            console.log('Starting site-based auth in Electron')
            
            // Проверяем, что мы в Electron
            if (!window.electronAPI) {
                throw new Error('Electron API not available')
            }
            
            // Открываем встроенное окно авторизации
            const authResult = await window.electronAPI.openTelegramOAuth(loginUrl)
            
            if (!authResult.success) {
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
            isLoggingIn.value = false
            return { success: false, error: error.value }
        } finally {
            // Убеждаемся, что флаги сброшены в любом случае
            loading.value = false
            isLoggingIn.value = false
        }
    }


    // Авторизация тестового пользователя
    const testUserLogin = async () => {
        // Предотвращаем множественные одновременные попытки авторизации
        if (isLoggingIn.value) {
            console.log('Login already in progress, skipping...')
            return { success: false, error: 'Login already in progress' }
        }

        // Дождемся инициализации API URL для Electron
        if (window.electronAPI) {
            try {
                await initApiUrl()
            } catch (err) {
                console.error('Failed to initialize API URL:', err)
            }
        }

        isLoggingIn.value = true
        loading.value = true
        error.value = null
        
        try {
            console.log('Starting test user login...')
            
            // Отправляем запрос на авторизацию тестового пользователя
            const response = await apiService.testUserLogin()
            console.log('Test login API response:', response)
            
            // Небольшая задержка для установки cookies
            await new Promise(resolve => setTimeout(resolve, 500))
            
            // После успешной авторизации загружаем данные пользователя
            const result = await loadCurrentUser()
            
            if (result.success) {
                console.log('Test user logged in successfully')
                return { success: true }
            } else {
                console.error('Failed to load user after test login:', result.error)
                return { success: false, error: result.error || 'Failed to load user data after login' }
            }
        } catch (err) {
            error.value = err.response?.data?.detail || 'Ошибка авторизации тестового пользователя'
            console.error('Test user login error:', err)
            return { success: false, error: error.value }
        } finally {
            loading.value = false
            isLoggingIn.value = false
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