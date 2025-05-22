// js/components/index.js (обновленный)
export { BaseComponent } from './base-component.js';
export { Button } from './button.js';
export { Card } from './card.js';
export { Badge } from './badge.js';
export { Modal } from './modal.js';
export { Form, FormGroup } from './form.js';
export { Toast } from './toast.js';

// Утилитарные функции для работы с компонентами
export const createElement = (tag, options = {}) => new BaseComponent(tag, options);

export const createButton = (text, variant = 'primary', options = {}) => {
    return new Button({ ...options, text, variant });
};

export const createCard = (options = {}) => new Card(options);

export const createBadge = (text, variant = 'primary', options = {}) => {
    return new Badge(text, { ...options, variant });
};

export const createModal = (title, body, options = {}) => {
    return new Modal({ ...options, title, body });
};

export const createToast = (message, type = 'info', options = {}) => {
    return new Toast({ ...options, message, type });
};
