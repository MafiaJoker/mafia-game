// js/utils/toast-manager.js
import { Toast } from '../components/toast.js';
import { BaseComponent } from '../components/base-component.js';

export class ToastManager {
    constructor() {
        this.container = null;
        this.init();
    }
    
    init() {
        // Создаем контейнер для toast'ов если его еще нет
        this.container = document.getElementById('toast-container');
        
        if (!this.container) {
            this.container = new BaseComponent('div', {
                id: 'toast-container',
                className: 'toast-container position-fixed top-0 end-0 p-3',
                attributes: {
                    style: 'z-index: 1055;'
                }
            });
            
            document.body.appendChild(this.container.element);
        }
    }
    
    show(message, type = 'info', options = {}) {
        const toast = new Toast({
            message,
            type,
            ...options
        });
        
        this.container.appendChild(toast);
        toast.show();
        
        return toast;
    }
    
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }
    
    error(message, options = {}) {
        return this.show(message, 'error', { delay: 8000, ...options });
    }
    
    warning(message, options = {}) {
        return this.show(message, 'warning', { delay: 6000, ...options });
    }
    
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }
    
    // Метод для показа подтверждающих диалогов
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            const confirmToast = new Toast({
                message,
                type: 'warning',
                title: options.title || 'Подтверждение',
                autohide: false
            });
            
            // Заменяем стандартное тело toast'а на кастомное с кнопками
            const body = confirmToast.element.querySelector('.toast-body');
            body.innerHTML = `
                <p>${message}</p>
                <div class="d-flex gap-2 mt-2">
                    <button class="btn btn-sm btn-danger confirm-yes">Да</button>
                    <button class="btn btn-sm btn-secondary confirm-no">Нет</button>
                </div>
            `;
            
            // Обработчики кнопок
            body.querySelector('.confirm-yes').addEventListener('click', () => {
                confirmToast.hide();
                resolve(true);
            });
            
            body.querySelector('.confirm-no').addEventListener('click', () => {
                confirmToast.hide();
                resolve(false);
            });
            
            this.container.appendChild(confirmToast);
            confirmToast.show();
        });
    }
}

export default new ToastManager();
