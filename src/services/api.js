import axios from 'axios'

// Определяем API URL в зависимости от окружения
const getApiBaseUrl = async () => {
  // Для Electron получаем URL из переменных окружения main процесса
  if (window.electronAPI && window.electronAPI.getApiBaseUrl) {
    try {
      const electronApiUrl = await window.electronAPI.getApiBaseUrl()
      if (electronApiUrl) {
        console.log('Using Electron API URL from env:', electronApiUrl)
        return electronApiUrl
      }
    } catch (error) {
      console.warn('Failed to get API URL from Electron:', error)
    }
  }
  
  // Для Electron по умолчанию используем production API
  if (window.electronAPI) {
    console.log('Using default Electron API URL')
    return 'https://dev.jokermafia.am/api/v1'
  }
  
  // Для веб-разработки используем локальный API
  const webUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
  console.log('Using web API URL:', webUrl)
  return webUrl
}

// Инициализация API URL асинхронно
let API_BASE_URL = 'http://localhost:8000/api/v1' // Дефолтное значение
let apiInitPromise = null

const initApiUrl = async () => {
  if (!apiInitPromise) {
    apiInitPromise = getApiBaseUrl().then(url => {
      API_BASE_URL = url
      api.defaults.baseURL = url
      console.log('API Base URL initialized:', API_BASE_URL)
      console.log('Is Electron:', !!window.electronAPI)
      return url
    })
  }
  return apiInitPromise
}

// Инициализируем сразу если возможно
if (typeof window !== 'undefined') {
  initApiUrl()
}

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
	'Content-Type': 'application/json',
        "haha": "hoho"
    },
})

// Интерцепторы для обработки ответов
api.interceptors.response.use(
    (response) => {
        // Проверяем, что ответ содержит JSON, а не HTML
        if (response.headers['content-type']?.includes('text/html')) {
            console.error('API returned HTML instead of JSON:', {
                url: response.config.url,
                status: response.status,
                data: response.data
            })
            throw new Error(`API endpoint returned HTML instead of JSON: ${response.config.url}`)
        }
        return response
    },
    (error) => {
        console.error('API Request Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        })

        if (error.response?.status === 401) {
            console.log('Unauthorized (401) - user not authenticated')
            // Не делаем автоматический редирект здесь - пусть роутер это обрабатывает
            // Автоматический редирект может создавать проблемы с навигацией
        }
        return Promise.reject(error)
    }
)

// Экспортируем функцию инициализации
export { initApiUrl }

export const apiService = {
    // Методы авторизации
    async telegramLogin(telegramData) {
        const response = await api.put('/auth/telegram', telegramData)
        return response.data
    },



    async updateProfile(profileData) {
        const response = await api.patch('/auth/profile', profileData)
        return response.data
    },
    // Events
    async getEvents() {
	const response = await api.get('/events')
        return response.data.items || response.data
    },

    async testUserLogin() {
        const response = await api.put('/auth/token',
                                       {"id": "e6ad1ca2-4a84-4845-ad8d-7f5617d0af5a", "role": "cashier"},
                                       {headers: {'Authorization': 'Basic e37bd08d'}}
        )
        return response.data
    },

    async getEvent(eventId) {
	const response = await api.get(`/events/${eventId}`)
	return response.data
    },

    async createEvent(eventData) {
	const response = await api.post('/events', eventData)
	return response.data
    },

    async updateEvent(eventId, eventData) {
	const response = await api.patch(`/events/${eventId}`, eventData)
	return response.data
    },

    async deleteEvent(eventId) {
	await api.delete(`/events/${eventId}`)
    },

    // Event Types
    async getEventTypes() {
	const response = await api.get('/event-types')
	return response.data
    },

    async createEventType(eventTypeData) {
	const response = await api.post('/event-types', eventTypeData)
	return response.data
    },

    async updateEventType(eventTypeId, eventTypeData) {
	const response = await api.patch(`/event-types/${eventTypeId}`, eventTypeData)
	return response.data
    },

    async deleteEventType(eventTypeId) {
	await api.delete(`/event-types/${eventTypeId}`)
    },

    // Games
    async getGames() {
	const response = await api.get('/games')
	return response.data
    },

    async getGame(gameId) {
	const response = await api.get(`/games/${gameId}`)
	return response.data
    },

    async getGamesByEventAndTable(eventId, tableId) {
	const response = await api.get(`/games?eventId=${eventId}&table_id=${tableId}`)
	return response.data
    },

    async createGame(gameData) {
	const response = await api.post('/games', gameData)
	return response.data
    },

    async updateGame(gameId, gameData) {
	const response = await api.patch(`/games/${gameId}`, gameData)
	return response.data
    },

    async deleteGame(gameId) {
	await api.delete(`/games/${gameId}`)
    },

    // Game State
    async getGameState(gameId) {
	const response = await api.get(`/games/${gameId}/state`)
	return response.data
    },

    async saveGameState(gameId, stateData) {
	const response = await api.put(`/games/${gameId}/state`, stateData)
	return response.data
    },

    // Game Players
    async setPlayersPoints(gameId, playersData) {
	const response = await api.put(`/games/${gameId}/players`, playersData)
	return response.data
    },

    async createGamePlayers(gameId, playersData) {
	const response = await api.post(`/games/${gameId}/players`, playersData)
	return response.data
    },

    async addPlayersToGame(gameId, playersData) {
	const response = await api.post(`/games/${gameId}/players`, playersData)
	return response.data
    },

    // Game Phases
    async updateGamePhase(gameId, phaseData) {
	const response = await api.put(`/games/${gameId}/phases`, phaseData)
	return response.data
    },

    async createGamePhase(gameId, phaseData) {
	const response = await api.post(`/games/${gameId}/phases`, phaseData)
	return response.data
    },

    // Users
    async getUsers() {
	const response = await api.get('/users')
	return response.data
    },

    async createUser(userData) {
	const response = await api.post('/users', userData)
	return response.data
    },

    async updateUser(userId, userData) {
	const response = await api.put(`/users/${userId}`, userData)
	return response.data
    },

    async addTariffForUser(userId, tariffData) {
	const response = await api.put(`/users/${userId}/tariff`, tariffData)
	return response.data
    },


    // Tariffs
    async getTariffs() {
	const response = await api.get('/tariffs')
	return response.data
    },

    async createTariff(tariffData) {
	const response = await api.post('/tariffs', tariffData)
	return response.data
    },

    async updateTariff(tariffId, tariffData) {
	const response = await api.put(`/tariffs/${tariffId}`, tariffData)
	return response.data
    },

    async deleteTariff(tariffId) {
	await api.delete(`/tariffs/${tariffId}`)
    },

    // Invoices
    async getInvoices() {
	const response = await api.get('/invoices')
	return response.data
    },

    async getMyInvoices() {
	const response = await api.get('/invoices/me')
	return response.data
    },

    async createInvoice(invoiceData) {
	const response = await api.post('/invoices', invoiceData)
	return response.data
    },

    async closeInvoice(invoiceId, invoiceData) {
	const response = await api.put(`/invoices/${invoiceId}`, invoiceData)
	return response.data
    },

    async deleteInvoice(invoiceId) {
	await api.delete(`/invoices/${invoiceId}`)
    },

    // Users
    async getCurrentUser() {
	const response = await api.get('/users/me')
	return response.data
    },

    // Logout
    async logout() {
	try {
	    await api.delete('/auth/logout')
	} catch (error) {
	    console.error('Logout failed:', error)
	    throw error
	}
    }
}
