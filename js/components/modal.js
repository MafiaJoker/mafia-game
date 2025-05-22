// js/components/modal.js
import { BaseComponent } from './base-component.js';
import { Button } from './button.js';

export class Modal extends BaseComponent {
    constructor(options = {}) {
        super('div', {
            className: 'modal fade',
            attributes: {
                tabindex: '-1',
                'aria-hidden': 'true'
            }
        });
        
        this.dialog = new BaseComponent('div', { className: 'modal-dialog' });
        this.content = new BaseComponent('div', { className: 'modal-content' });
        this.header = null;
        this.body = null;
        this.footer = null;
        
        this.appendChild(this.dialog);
        this.dialog.appendChild(this.content);
        
        if (options.size) {
            this.setSize(options.size);
        }
        
        if (options.centered) {
            this.dialog.addClass('modal-dialog-centered');
        }
        
        if (options.scrollable) {
            this.dialog.addClass('modal-dialog-scrollable');
        }
        
        if (options.title) {
            this.setTitle(options.title);
        }
        
        if (options.body) {
            this.setBody(options.body);
        }
        
        this.bootstrapModal = null;
    }
    
    setSize(size) {
        const sizes = ['sm', 'lg', 'xl'];
        sizes.forEach(s => this.dialog.removeClass(`modal-${s}`));
        
        if (sizes.includes(size)) {
            this.dialog.addClass(`modal-${size}`);
        }
        return this;
    }
    
    setTitle(title, options = {}) {
        if (!this.header) {
            this.header = new BaseComponent('div', { className: 'modal-header' });
            this.content.appendChild(this.header);
            
            // Добавляем кнопку закрытия
            const closeButton = new Button({
                className: 'btn-close',
                attributes: { 'data-bs-dismiss': 'modal', 'aria-label': 'Close' }
            });
            
            this.header.appendChild(closeButton);
        }
        
        // Удаляем существующий заголовок если есть
        const existingTitle = this.header.element.querySelector('.modal-title');
        if (existingTitle) {
            existingTitle.remove();
        }
        
        const titleElement = new BaseComponent('h5', {
            className: 'modal-title',
            text: title
        });
        
        this.header.element.insertBefore(titleElement.element, this.header.element.firstChild);
        
        if (options.bgColor) {
            this.header.addClass(`bg-${options.bgColor}`);
        }
        
        if (options.textColor) {
            this.header.addClass(`text-${options.textColor}`);
        }
        
        return this;
    }
    
    setBody(content) {
        if (!this.body) {
            this.body = new BaseComponent('div', { className: 'modal-body' });
            this.content.appendChild(this.body);
        }
        
        if (typeof content === 'string') {
            this.body.setHtml(content);
        } else if (content instanceof BaseComponent) {
            this.body.element.innerHTML = '';
            this.body.appendChild(content);
        }
        
        return this;
    }
    
    setFooter(buttons = []) {
        if (!this.footer) {
            this.footer = new BaseComponent('div', { className: 'modal-footer' });
            this.content.appendChild(this.footer);
        }
        
        this.footer.element.innerHTML = '';
        
        buttons.forEach(button => {
            if (button instanceof Button) {
                this.footer.appendChild(button);
            }
        });
        
        return this;
    }
    
    show() {
        if (!this.bootstrapModal) {
            this.bootstrapModal = new bootstrap.Modal(this.element);
        }
        this.bootstrapModal.show();
        return this;
    }
    
    hide() {
        if (this.bootstrapModal) {
            this.bootstrapModal.hide();
        }
        return this;
    }
    
    onShow(callback) {
        this.element.addEventListener('shown.bs.modal', callback);
        return this;
    }
    
    onHide(callback) {
        this.element.addEventListener('hidden.bs.modal', callback);
        return this;
    }
}
