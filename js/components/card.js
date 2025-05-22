// js/components/card.js
import { BaseComponent } from './base-component.js';

export class Card extends BaseComponent {
    constructor(options = {}) {
        super('div', { ...options, className: `card ${options.className || ''}` });
        
        this.header = null;
        this.body = null;
        this.footer = null;
        
        if (options.shadow) {
            this.addClass('shadow-sm');
        }
        
        if (options.header) {
            this.setHeader(options.header);
        }
        
        if (options.body || options.content) {
            this.setBody(options.body || options.content);
        }
        
        if (options.footer) {
            this.setFooter(options.footer);
        }
    }
    
    setHeader(content, options = {}) {
        if (!this.header) {
            this.header = new BaseComponent('div', {
                className: `card-header ${options.className || ''}`
            });
            this.appendChild(this.header);
        }
        
        if (typeof content === 'string') {
            this.header.setHtml(content);
        } else if (content instanceof BaseComponent) {
            this.header.appendChild(content);
        }
        
        if (options.bgColor) {
            this.header.addClass(`bg-${options.bgColor}`);
        }
        
        if (options.textColor) {
            this.header.addClass(`text-${options.textColor}`);
        }
        
        return this;
    }
    
    setBody(content, options = {}) {
        if (!this.body) {
            this.body = new BaseComponent('div', {
                className: `card-body ${options.className || ''}`
            });
            this.appendChild(this.body);
        }
        
        if (typeof content === 'string') {
            this.body.setHtml(content);
        } else if (content instanceof BaseComponent) {
            this.body.appendChild(content);
        }
        
        return this;
    }
    
    setFooter(content, options = {}) {
        if (!this.footer) {
            this.footer = new BaseComponent('div', {
                className: `card-footer ${options.className || ''}`
            });
            this.appendChild(this.footer);
        }
        
        if (typeof content === 'string') {
            this.footer.setHtml(content);
        } else if (content instanceof BaseComponent) {
            this.footer.appendChild(content);
        }
        
        return this;
    }
    
    setTitle(title) {
        if (!this.body) {
            this.setBody('');
        }
        
        const titleElement = new BaseComponent('h5', {
            className: 'card-title',
            text: title
        });
        
        this.body.element.insertBefore(titleElement.element, this.body.element.firstChild);
        return this;
    }
    
    setText(text) {
        if (!this.body) {
            this.setBody('');
        }
        
        const textElement = new BaseComponent('p', {
            className: 'card-text',
            text: text
        });
        
        this.body.appendChild(textElement);
        return this;
    }
}
