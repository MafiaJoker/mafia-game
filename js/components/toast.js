// js/components/toast.js
import { BaseComponent } from './base-component.js';

export class Toast extends BaseComponent {
    constructor(options = {}) {
        super('div', {
            className: 'toast',
            attributes: {
                role: 'alert',
                'aria-live': 'assertive',
                'aria-atomic': 'true'
            }
        });
        
        this.options = {
            autohide: true,
            delay: 5000,
            ...options
        };
        
        this.createToastStructure();
        this.setupBootstrapToast();
    }
    
    createToastStructure() {
        // Создаем заголовок toast'а
        const header = new BaseComponent('div', { className: 'toast-header' });
        
        // Иконка в зависимости от типа
        const icon = this.createIcon();
        if (icon) {
            header.appendChild(icon);
        }
        
        // Заголовок
        const title = new BaseComponent('strong', {
            className: 'me-auto',
            text: this.options.title || this.getDefaultTitle()
        });
        header.appendChild(title);
        
        // Время
        if (this.options.showTime !== false) {
            const time = new BaseComponent('small', {
                className: 'text-muted',
                text: 'сейчас'
            });
            header.appendChild(time);
        }
        
        // Кнопка закрытия
        const closeButton = new BaseComponent('button', {
            className: 'btn-close',
            attributes: {
                type: 'button',
                'data-bs-dismiss': 'toast',
                'aria-label': 'Close'
            }
        });
        header.appendChild(closeButton);
        
        this.appendChild(header);
        
        // Тело toast'а
        const body = new BaseComponent('div', {
            className: 'toast-body',
            text: this.options.message || ''
        });
        this.appendChild(body);
        
        // Применяем стили в зависимости от типа
        this.applyTypeStyles();
    }
    
    createIcon() {
        const iconClasses = {
            success: 'bi bi-check-circle-fill text-success',
            error: 'bi bi-exclamation-triangle-fill text-danger',
            warning: 'bi bi-exclamation-triangle-fill text-warning',
            info: 'bi bi-info-circle-fill text-info'
        };
        
        const iconClass = iconClasses[this.options.type];
        if (iconClass) {
            return new BaseComponent('i', {
                className: `${iconClass} me-2`
            });
        }
        return null;
    }
    
    getDefaultTitle() {
        const titles = {
            success: 'Успешно',
            error: 'Ошибка',
            warning: 'Внимание',
            info: 'Информация'
        };
        
        return titles[this.options.type] || 'Уведомление';
    }
    
    applyTypeStyles() {
        const typeStyles = {
            success: 'border-success',
            error: 'border-danger',
            warning: 'border-warning',
            info: 'border-info'
        };
        
        const borderClass = typeStyles[this.options.type];
        if (borderClass) {
            this.addClass(borderClass);
        }
    }
    
    setupBootstrapToast() {
        this.bootstrapToast = new bootstrap.Toast(this.element, {
            autohide: this.options.autohide,
            delay: this.options.delay
        });
        
        // Событие при скрытии toast'а
        this.element.addEventListener('hidden.bs.toast', () => {
            this.remove();
        });
    }
    
    show() {
        this.bootstrapToast.show();
        return this;
    }
    
    hide() {
        this.bootstrapToast.hide();
        return this;
    }
}

// Фабричные методы для быстрого создания toast'ов
Toast.success = (message, options = {}) => new Toast({ ...options, type: 'success', message });
Toast.error = (message, options = {}) => new Toast({ ...options, type: 'error', message });
Toast.warning = (message, options = {}) => new Toast({ ...options, type: 'warning', message });
Toast.info = (message, options = {}) => new Toast({ ...options, type: 'info', message });
