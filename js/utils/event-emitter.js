// utils/event-emitter.js
export class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }

    off(eventName, callback) {
        if (!this.events[eventName]) return;
        
        this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    }

    emit(eventName, data) {
        const handlers = this.events[eventName];
        if (handlers) {
            handlers.forEach(callback => callback(data));
        }
    }
}

export default EventEmitter;
