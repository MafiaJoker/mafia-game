// js/components/badge.js
import { BaseComponent } from './base-component.js';

export class Badge extends BaseComponent {
    constructor(text, options = {}) {
        const defaultOptions = {
            className: 'badge',
            text: text
        };
        
        super('span', { ...defaultOptions, ...options });
        
        this.setVariant(options.variant || 'primary');
        
        if (options.pill) {
            this.addClass('rounded-pill');
        }
    }
    
    setVariant(variant) {
        // Удаляем все существующие варианты
        const variants = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];
        variants.forEach(v => {
            this.element.classList.remove(`bg-${v}`, `text-bg-${v}`);
        });
        
        // Добавляем новый вариант
        this.addClass(`bg-${variant}`);
        return this;
    }
}

// Фабричные методы
Badge.primary = (text, options = {}) => new Badge(text, { ...options, variant: 'primary' });
Badge.secondary = (text, options = {}) => new Badge(text, { ...options, variant: 'secondary' });
Badge.success = (text, options = {}) => new Badge(text, { ...options, variant: 'success' });
Badge.danger = (text, options = {}) => new Badge(text, { ...options, variant: 'danger' });
Badge.warning = (text, options = {}) => new Badge(text, { ...options, variant: 'warning' });
Badge.info = (text, options = {}) => new Badge(text, { ...options, variant: 'info' });
Badge.light = (text, options = {}) => new Badge(text, { ...options, variant: 'light' });
Badge.dark = (text, options = {}) => new Badge(text, { ...options, variant: 'dark' });
