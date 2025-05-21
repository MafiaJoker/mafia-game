// js/models/event-model.js
import { EventEmitter } from '../utils/event-emitter.js';
import apiAdapter from '../adapter.js';

export const EVENT_STATUSES = {
    PLANNED: 'planned',
    ACTIVE: 'active',
    COMPLETED: 'completed'
};

export const EVENT_CATEGORIES = {
    FUNKY: 'funky',
    MINICAP: 'minicap',
    TOURNAMENT: 'tournament',
    CHARITY: 'charity_tournament'
};

export const CATEGORY_PRIORITIES = {
  'tournament': 1,        // Турнир (высший приоритет)
  'minicap': 2,           // Миникап
  'charity_tournament': 3, // Благотворительный вечер
  'funky': 4               // Фанки (низший приоритет)
};

export class EventModel extends EventEmitter {
    constructor() {
        super();
        this.events = [];
    }

    async loadEvents() {
        try {
            this.events = await apiAdapter.loadEvents();
            console.log('Загружено мероприятий:', this.events.length);
            this.emit('eventsLoaded', this.events);
            return this.events;
        } catch (error) {
            console.error('Ошибка загрузки мероприятий:', error);
            this.events = [];
            this.emit('eventsLoaded', this.events);
            return [];
        }
    }

    async createEvent(eventData) {
        try {
            const newEvent = await apiAdapter.saveEvent(eventData);
            this.events.push(newEvent);
            this.emit('eventPlanned', newEvent);
            return newEvent;
        } catch (error) {
            console.error('Ошибка создания мероприятия:', error);
            return null;
        }
    }

    getEventById(eventId) {
        return this.events.find(event => event.id === eventId);
    }

    async addTableToEvent(eventId, tableData) {
        try {
            const newTable = await apiAdapter.saveTable(eventId, tableData);
            
            // Обновляем локальный объект мероприятия
            const event = this.getEventById(eventId);
            if (event) {
                if (!event.tables) event.tables = [];
                event.tables.push(newTable);
                this.emit('tableAdded', { event, table: newTable });
            }
            
            return newTable;
        } catch (error) {
            console.error('Ошибка добавления стола:', error);
            return null;
        }
    }

    // Добавляем метод для изменения статуса мероприятия
    async updateEventStatus(eventId, status) {
        if (!Object.values(EVENT_STATUSES).includes(status)) {
            console.error('Некорректный статус мероприятия:', status);
            return false;
        }

        try {
            const event = this.getEventById(eventId);
            if (!event) {
                console.error('Мероприятие не найдено:', eventId);
                return false;
            }

            // Отправляем запрос на обновление статуса мероприятия
            const updatedEvent = await apiAdapter.updateEvent(eventId, {
                ...event,
                status: status
            });

            // Обновляем локальный объект мероприятия
            if (updatedEvent) {
                const index = this.events.findIndex(e => e.id === eventId);
                if (index !== -1) {
                    this.events[index] = updatedEvent;
                    this.emit('eventUpdated', updatedEvent);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Ошибка обновления статуса мероприятия:', error);
            return false;
        }
    }

    // Проверка возможности добавления стола и игры в зависимости от статуса
    canAddTable(eventId) {
        const event = this.getEventById(eventId);
        return event && event.status !== EVENT_STATUSES.COMPLETED;
    }

    canAddGame(eventId) {
        const event = this.getEventById(eventId);
        return event && event.status !== EVENT_STATUSES.COMPLETED;
    }

    // Переопределим метод добавления стола для проверки статуса
    async addTableToEvent(eventId, tableData) {
        if (!this.canAddTable(eventId)) {
            console.error('Невозможно добавить стол к завершенному мероприятию');
            return null;
        }
        
        // Существующий код метода...
        try {
            const newTable = await apiAdapter.saveTable(eventId, tableData);
            
            // Обновляем локальный объект мероприятия
            const event = this.getEventById(eventId);
            if (event) {
                if (!event.tables) event.tables = [];
                event.tables.push(newTable);
                this.emit('tableAdded', { event, table: newTable });
            }
            
            return newTable;
        } catch (error) {
            console.error('Ошибка добавления стола:', error);
            return null;
        }
    }

    // Получение категорий мероприятий
    getCategories() {
        return Object.entries(EVENT_CATEGORIES).map(([key, value]) => ({ id: value, name: this.getCategoryName(value) }));
    }

    // Получение статусов мероприятий
    getStatuses() {
        return Object.entries(EVENT_STATUSES).map(([key, value]) => ({ id: value, name: this.getStatusName(value) }));
    }

    // Получение названия категории
    getCategoryName(category) {
        switch (category) {
        case EVENT_CATEGORIES.FUNKY: return 'Фанки';
        case EVENT_CATEGORIES.MINICAP: return 'Миникап';
        case EVENT_CATEGORIES.TOURNAMENT: return 'Турнир';
        case EVENT_CATEGORIES.CHARITY: return 'Благотворительный турнир';
        default: return 'Неизвестная категория';
        }
    }

    // Получение названия статуса
    getStatusName(status) {
        switch (status) {
        case EVENT_STATUSES.PLANNED: return 'В планах';
        case EVENT_STATUSES.ACTIVE: return 'Активно';
        case EVENT_STATUSES.COMPLETED: return 'Завершено';
        default: return 'Неизвестный статус';
        }
    }
    
    async updateTable(eventId, tableId, tableData) {
        try {
            const updatedTable = await apiAdapter.updateTable(eventId, tableId, tableData);
            
            // Обновляем локальный объект мероприятия
            const event = this.getEventById(eventId);
            if (event) {
                const tableIndex = event.tables.findIndex(t => t.id === tableId);
                if (tableIndex !== -1) {
                    event.tables[tableIndex] = updatedTable;
                    this.emit('tableUpdated', { event, table: updatedTable });
                }
            }
            
            return updatedTable;
        } catch (error) {
            console.error('Ошибка обновления стола:', error);
            return false;
        }
    }

    searchEvents(searchTerm) {
        if (!searchTerm) return this.events;
        
        const term = searchTerm.toLowerCase();
        return this.events.filter(event => 
            event.name.toLowerCase().includes(term) || 
		(event.description && event.description.toLowerCase().includes(term))
        );
    }

    async deleteEvent(eventId) {
        try {
            console.log('Запуск удаления мероприятия:', eventId);
            
            // Проверяем, инициализирован ли адаптер
            if (!apiAdapter || typeof apiAdapter.deleteEvent !== 'function') {
                console.error('API адаптер не инициализирован или не имеет метода deleteEvent');
                return false;
            }
            
            const result = await apiAdapter.deleteEvent(eventId);
            console.log('Результат удаления:', result);
            
            // Удаляем мероприятие из локального списка
            this.events = this.events.filter(event => event.id !== eventId);
            this.emit('eventDeleted', eventId);
            return true;
        } catch (error) {
            console.error('Ошибка удаления мероприятия:', error);
            return false;
        }
    }
    
    // Получить активные и запланированные мероприятия с сортировкой по приоритетам
    getActiveEvents(searchTerm) {
	const events = this.searchEvents(searchTerm).filter(
	    event => event.status !== EVENT_STATUSES.COMPLETED
	);
	
	return this.sortEventsByPriority(events);
    }

    // Получить архивные (завершенные) мероприятия
    getArchivedEvents(searchTerm) {
	return this.searchEvents(searchTerm).filter(
	    event => event.status === EVENT_STATUSES.COMPLETED
	);
    }

    // Сортировка мероприятий по приоритетам
    sortEventsByPriority(events) {
	return [...events].sort((a, b) => {
	    // Сначала сортируем по статусу (активные выше запланированных)
	    if (a.status === EVENT_STATUSES.ACTIVE && b.status !== EVENT_STATUSES.ACTIVE) {
		return -1;
	    }
	    if (a.status !== EVENT_STATUSES.ACTIVE && b.status === EVENT_STATUSES.ACTIVE) {
		return 1;
	    }
	    
	    // Если статусы одинаковые, сортируем по приоритету категории
	    const priorityA = CATEGORY_PRIORITIES[a.category] || 999;
	    const priorityB = CATEGORY_PRIORITIES[b.category] || 999;
	    
	    return priorityA - priorityB;
	});
    }
}

export default new EventModel();
