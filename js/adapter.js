// js/adapter.js
export class ApiAdapter {
    constructor() {
        // Базовый URL API сервера
        this.baseUrl = 'http://localhost:3000/api';
        console.log('ApiAdapter инициализирован для работы с API');
    }

    // Общий метод для выполнения запросов
    async fetchApi(endpoint, options = {}) {
        try {
            console.log(`API запрос: ${this.baseUrl}${endpoint}`, options.method || 'GET');
            
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // МЕТОДЫ ДЛЯ РАБОТЫ С МЕРОПРИЯТИЯМИ

    // Загрузка всех мероприятий
    async loadEvents() {
        return this.fetchApi('/events');
    }

    // Получение мероприятия по ID
    async getEvent(eventId) {
        return this.fetchApi(`/events/${eventId}`);
    }

    // Сохранение нового мероприятия
    async saveEvent(eventData) {
        return this.fetchApi('/events', {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
    }

    // Обновление существующего мероприятия
    async updateEvent(eventId, eventData) {
        return this.fetchApi(`/events/${eventId}`, {
            method: 'PUT',
            body: JSON.stringify(eventData)
        });
    }
    
    // Удаление мероприятия
    async deleteEvent(eventId) {
	return this.fetchApi(`/events/${eventId}`, {
            method: 'DELETE'
	});
    }

    // МЕТОДЫ ДЛЯ РАБОТЫ СО СТОЛАМИ

    // Получение всех столов мероприятия
    async getTables(eventId) {
        return this.fetchApi(`/events/${eventId}/tables`);
    }

    // Получение стола по ID
    async getTable(eventId, tableId) {
        return this.fetchApi(`/events/${eventId}/tables/${tableId}`);
    }

    // Сохранение нового стола
    async saveTable(eventId, tableData) {
        return this.fetchApi(`/events/${eventId}/tables`, {
            method: 'POST',
            body: JSON.stringify(tableData)
        });
    }

    // Обновление существующего стола
    async updateTable(eventId, tableId, tableData) {
        return this.fetchApi(`/events/${eventId}/tables/${tableId}`, {
            method: 'PUT',
            body: JSON.stringify(tableData)
        });
    }

    // МЕТОДЫ ДЛЯ РАБОТЫ С ИГРАМИ

    // Получение всех игр стола
    async getGames(eventId, tableId) {
        return this.fetchApi(`/events/${eventId}/tables/${tableId}/games`);
    }

    // Получение игры по ID
    async getGame(eventId, tableId, gameId) {
        return this.fetchApi(`/events/${eventId}/tables/${tableId}/games/${gameId}`);
    }

    // Сохранение новой игры
    async saveGame(eventId, tableId, gameData) {
        return this.fetchApi(`/events/${eventId}/tables/${tableId}/games`, {
            method: 'POST',
            body: JSON.stringify(gameData)
        });
    }

    // Обновление существующей игры
    async updateGame(eventId, tableId, gameId, gameData) {
        return this.fetchApi(`/events/${eventId}/tables/${tableId}/games/${gameId}`, {
            method: 'PUT',
            body: JSON.stringify(gameData)
        });
    }

    // МЕТОДЫ ДЛЯ РАБОТЫ С СОСТОЯНИЕМ ИГРЫ

    // Получение состояния игры
    async getGameState(gameId) {
        return this.fetchApi(`/games/${gameId}/state`);
    }

    // Сохранение состояния игры
    async saveGameState(gameId, stateData) {
        return this.fetchApi(`/games/${gameId}/state`, {
            method: 'PUT',
            body: JSON.stringify(stateData)
        });
    }

    // Получение списка всех ведущих
    async loadJudges() {
	return this.fetchApi('/judges');
    }

    // Получение ведущего по ID
    async getJudge(judgeId) {
	return this.fetchApi(`/judges/${judgeId}`);
    }

    async deleteTable(eventId, tableId) {
	return this.fetchApi(`/events/${eventId}/tables/${tableId}`, {
            method: 'DELETE'
	});
    }
    
}

export default new ApiAdapter();
