// models/event-model.js
import { EventEmitter } from '../utils/event-emitter.js';

export class EventModel extends EventEmitter {
    constructor() {
        super();
        this.events = [];
        this.loadEvents();
    }

    loadEvents() {
        const savedEvents = localStorage.getItem('mafiaEvents');
        if (savedEvents) {
            this.events = JSON.parse(savedEvents);
            this.emit('eventsLoaded', this.events);
        }
    }

    saveEvents() {
        localStorage.setItem('mafiaEvents', JSON.stringify(this.events));
    }

    createEvent(eventData) {
        const newEvent = {
            id: Date.now(),
            name: eventData.name,
            description: eventData.description,
            date: eventData.date || new Date().toISOString().split('T')[0],
            tables: []
        };

        this.events.push(newEvent);
        this.saveEvents();
        this.emit('eventCreated', newEvent);
        return newEvent;
    }

    getEventById(eventId) {
        return this.events.find(event => event.id === eventId);
    }

    addTableToEvent(eventId, tableData) {
        const event = this.getEventById(eventId);
        if (!event) return null;

        const newTable = {
            id: Date.now(),
            name: tableData.name,
            capacity: parseInt(tableData.capacity),
            seatingType: tableData.seatingType,
            games: []
        };

        event.tables.push(newTable);
        this.saveEvents();
        this.emit('tableAdded', { event, table: newTable });
        return newTable;
    }

    updateTable(eventId, tableId, tableData) {
        const event = this.getEventById(eventId);
        if (!event) return false;

        const table = event.tables.find(table => table.id === tableId);
        if (!table) return false;

        Object.assign(table, tableData);
        this.saveEvents();
        this.emit('tableUpdated', { event, table });
        return true;
    }

    searchEvents(searchTerm) {
        if (!searchTerm) return this.events;
        
        const term = searchTerm.toLowerCase();
        return this.events.filter(event => 
            event.name.toLowerCase().includes(term) || 
		event.description.toLowerCase().includes(term)
        );
    }
}

export default new EventModel();
