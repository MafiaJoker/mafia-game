// js/components/base-component.js
export class BaseComponent {
    constructor(tag = 'div', options = {}) {
        this.element = document.createElement(tag);
        this.options = options;
        this.children = [];
        
        if (options.className) {
            this.element.className = options.className;
        }
        
        if (options.id) {
            this.element.id = options.id;
        }
        
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                this.element.setAttribute(key, value);
            });
        }
        
        if (options.data) {
            Object.entries(options.data).forEach(([key, value]) => {
                this.element.dataset[key] = value;
            });
        }
        
        if (options.text) {
            this.element.textContent = options.text;
        }
        
        if (options.html) {
            this.element.innerHTML = options.html;
        }
        
        if (options.events) {
            Object.entries(options.events).forEach(([event, handler]) => {
                this.element.addEventListener(event, handler);
            });
        }
    }
    
    addClass(className) {
        this.element.classList.add(className);
        return this;
    }
    
    removeClass(className) {
        this.element.classList.remove(className);
        return this;
    }
    
    toggleClass(className) {
        this.element.classList.toggle(className);
        return this;
    }
    
    setAttribute(name, value) {
        this.element.setAttribute(name, value);
        return this;
    }
    
    setData(key, value) {
        this.element.dataset[key] = value;
        return this;
    }
    
    setText(text) {
        this.element.textContent = text;
        return this;
    }
    
    setHtml(html) {
        this.element.innerHTML = html;
        return this;
    }
    
    appendChild(child) {
        if (child instanceof BaseComponent) {
            this.element.appendChild(child.element);
            this.children.push(child);
        } else if (child instanceof HTMLElement) {
            this.element.appendChild(child);
        }
        return this;
    }
    
    appendTo(parent) {
        if (parent instanceof BaseComponent) {
            parent.appendChild(this);
        } else if (parent instanceof HTMLElement) {
            parent.appendChild(this.element);
        }
        return this;
    }
    
    on(event, handler) {
        this.element.addEventListener(event, handler);
        return this;
    }
    
    hide() {
        this.element.classList.add('d-none');
        return this;
    }
    
    show() {
        this.element.classList.remove('d-none');
        return this;
    }
    
    toggle() {
        this.element.classList.toggle('d-none');
        return this;
    }
    
    remove() {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        return this;
    }
    
    render() {
        return this.element;
    }
}
