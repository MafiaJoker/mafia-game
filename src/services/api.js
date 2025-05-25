import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
	'Content-Type': 'application/json'
    }
})

export const apiService = {
    // Events
    async getEvents() {
	const response = await api.get('/events')
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
	const response = await api.put(`/events/${eventId}`, eventData)
	return response.data
    },

    async deleteEvent(eventId) {
	await api.delete(`/events/${eventId}`)
    },

    // Tables
    async getTables(eventId) {
	const response = await api.get(`/events/${eventId}/tables`)
	return response.data
    },

    async createTable(eventId, tableData) {
	const response = await api.post(`/events/${eventId}/tables`, tableData)
	return response.data
    },

    async updateTable(eventId, tableId, tableData) {
	const response = await api.put(`/events/${eventId}/tables/${tableId}`, tableData)
	return response.data
    },

    async deleteTable(eventId, tableId) {
	await api.delete(`/events/${eventId}/tables/${tableId}`)
    },

    // Games
    async getGames(eventId, tableId) {
	const response = await api.get(`/events/${eventId}/tables/${tableId}/games`)
	return response.data
    },

    async createGame(eventId, tableId, gameData) {
	const response = await api.post(`/events/${eventId}/tables/${tableId}/games`, gameData)
	return response.data
    },

    async updateGame(eventId, tableId, gameId, gameData) {
	const response = await api.put(`/events/${eventId}/tables/${tableId}/games/${gameId}`, gameData)
	return response.data
    },

    async deleteGame(eventId, tableId, gameId) {
	await api.delete(`/events/${eventId}/tables/${tableId}/games/${gameId}`)
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

    // Judges
    async getJudges() {
	const response = await api.get('/judges')
	return response.data
    },

    async getJudge(judgeId) {
	const response = await api.get(`/judges/${judgeId}`)
	return response.data
    }
}
