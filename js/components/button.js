// js/components/button.js
import { BaseComponent } from './base-component.js';

export class Button extends BaseComponent {
    constructor(options = {}) {
        const defaultOptions = {
            tag: 'button',
            className: 'btn',
            type: 'button'
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        super('button', mergedOptions);
        
        // Устанавливаем тип кнопки
        this.element.type = mergedOptions.type;
        
        // Добавляем стандартные стили Bootstrap
        this.setVariant(options.variant || 'primary');
        this.setSize(options.size);
        
        if (options.disabled) {
            this.setDisabled(true);
        }
        
        if (options.icon) {
            this.setIcon(options.icon);
        }
    }
    
    setVariant(variant) {
        // Удаляем все существующие варианты
        const variants = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];
        variants.forEach(v => {
            this.element.classList.remove(`btn-${v}`, `btn-outline-${v}`);
        });
        
        // Добавляем новый вариант
        if (variant.startsWith('outline-')) {
            this.element.classList.add(`btn-${variant}`);
        } else {
            this.element.classList.add(`btn-${variant}`);
        }
        return this;
    }
    
    setSize(size) {
        if (size) {
            this.element.classList.add(`btn-${size}`);
        }
        return this;
    }
    
    setDisabled(disabled) {
        this.element.disabled = disabled;
        return this;
    }
    
    setIcon(iconClass) {
        const iconElement = document.createElement('i');
        iconElement.className = iconClass;
        
        if (this.element.textContent) {
            iconElement.classList.add('me-1');
            this.element.insertBefore(iconElement, this.element.firstChild);
        } else {
            this.element.appendChild(iconElement);
        }
        return this;
    }
    
    setLoading(loading = true) {
        if (loading) {
            this.originalText = this.element.textContent;
            this.element.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Загрузка...';
            this.setDisabled(true);
        } else {
            this.element.textContent = this.originalText || '';
            this.setDisabled(false);
        }
        return this;
    }
    
    onClick(handler) {
        return this.on('click', handler);
    }
}

// Фабричные методы для быстрого создания часто используемых кнопок
Button.primary = (text, options = {}) => new Button({ ...options, variant: 'primary', text });
Button.secondary = (text, options = {}) => new Button({ ...options, variant: 'secondary', text });
Button.success = (text, options = {}) => new Button({ ...options, variant: 'success', text });
Button.danger = (text, options = {}) => new Button({ ...options, variant: 'danger', text });
Button.warning = (text, options = {}) => new Button({ ...options, variant: 'warning', text });
Button.info = (text, options = {}) => new Button({ ...options, variant: 'info', text });
Button.light = (text, options = {}) => new Button({ ...options, variant: 'light', text });
Button.dark = (text, options = {}) => new Button({ ...options, variant: 'dark', text });

Button.outlinePrimary = (text, options = {}) => new Button({ ...options, variant: 'outline-primary', text });
Button.outlineSecondary = (text, options = {}) => new Button({ ...options, variant: 'outline-secondary', text });
Button.outlineDanger = (text, options = {}) => new Button({ ...options, variant: 'outline-danger', text });
