// js/models/event-model.js
import { EventEmitter } from '../utils/event-emitter.js';
import apiAdapter from '../adapter.js';

export class EventModel extends EventEmitter {
    constructor() {
        super();
        this.events = [];
        this.loadEvents();
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
            this.emit('eventCreated', newEvent);
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
}

export default new EventModel();
