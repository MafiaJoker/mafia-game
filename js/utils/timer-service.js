// utils/timer-service.js
import { TIMER_INTERVALS } from './constants.js';
import EventEmitter from './event-emitter.js';

export class TimerService extends EventEmitter {
    constructor() {
        super();
        this.seconds = 0;
        this.interval = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.interval = setInterval(() => {
            this.seconds++;
            this.emit('tick', this.getFormattedTime());
        }, TIMER_INTERVALS.SECOND);
        
        this.emit('started', this.getFormattedTime());
    }

    stop() {
        if (!this.isRunning) return;
        
        clearInterval(this.interval);
        this.interval = null;
        this.isRunning = false;
        
        this.emit('stopped', this.getFormattedTime());
    }

    reset() {
        this.stop();
        this.seconds = 0;
        this.emit('reset', this.getFormattedTime());
    }

    getFormattedTime() {
        const minutes = Math.floor(this.seconds / 60);
        const remainingSeconds = this.seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

export default new TimerService();
