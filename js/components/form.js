// js/components/form.js
import { BaseComponent } from './base-component.js';

export class Form extends BaseComponent {
    constructor(options = {}) {
        super('form', options);
        this.fields = new Map();
    }
    
    addField(name, fieldComponent) {
        this.fields.set(name, fieldComponent);
        this.appendChild(fieldComponent);
        return this;
    }
    
    addInput(name, options = {}) {
        const fieldGroup = new FormGroup(options);
        this.addField(name, fieldGroup);
        return fieldGroup;
    }
    
    addSelect(name, options = {}) {
        const fieldGroup = new FormGroup({ ...options, type: 'select' });
        this.addField(name, fieldGroup);
        return fieldGroup;
    }
    
    addTextarea(name, options = {}) {
        const fieldGroup = new FormGroup({ ...options, type: 'textarea' });
        this.addField(name, fieldGroup);
        return fieldGroup;
    }
    
    getValues() {
        const values = {};
        this.fields.forEach((field, name) => {
            values[name] = field.getValue();
        });
        return values;
    }
    
    setValues(values) {
        Object.entries(values).forEach(([name, value]) => {
            const field = this.fields.get(name);
            if (field) {
                field.setValue(value);
            }
        });
        return this;
    }
    
    reset() {
        this.element.reset();
        return this;
    }
    
    validate() {
        let isValid = true;
        this.fields.forEach(field => {
            if (!field.validate()) {
                isValid = false;
            }
        });
        return isValid;
    }
    
    onSubmit(handler) {
        this.element.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.validate()) {
                handler(this.getValues(), e);
            }
        });
        return this;
    }
}

export class FormGroup extends BaseComponent {
    constructor(options = {}) {
        super('div', { className: 'mb-3' });
        
        this.label = null;
        this.input = null;
        this.helpText = null;
        this.feedback = null;
        
        if (options.label) {
            this.setLabel(options.label);
        }
        
        this.createInput(options);
        
        if (options.helpText) {
            this.setHelpText(options.helpText);
        }
        
        if (options.required) {
            this.input.setAttribute('required', '');
        }
    }
    
    setLabel(text) {
        if (!this.label) {
            this.label = new BaseComponent('label', {
                className: 'form-label',
                text: text
            });
            this.appendChild(this.label);
        } else {
            this.label.setText(text);
        }
        return this;
    }
    
    createInput(options) {
        const type = options.type || 'text';
        
        if (type === 'select') {
            this.input = new BaseComponent('select', {
                className: 'form-select',
                attributes: options.attributes
            });
            
            if (options.options) {
                options.options.forEach(option => {
                    const optionElement = new BaseComponent('option', {
                        attributes: { value: option.value },
                        text: option.text
                    });
                    this.input.appendChild(optionElement);
                });
            }
        } else if (type === 'textarea') {
            this.input = new BaseComponent('textarea', {
                className: 'form-control',
                attributes: options.attributes
            });
            
            if (options.rows) {
                this.input.setAttribute('rows', options.rows);
            }
        } else {
            this.input = new BaseComponent('input', {
                className: 'form-control',
                attributes: {
                    type: type,
                    ...options.attributes
                }
            });
        }
        
        if (options.placeholder) {
            this.input.setAttribute('placeholder', options.placeholder);
        }
        
        if (options.value) {
            this.setValue(options.value);
        }
        
        this.appendChild(this.input);
        return this;
    }
    
    setHelpText(text) {
        if (!this.helpText) {
            this.helpText = new BaseComponent('div', {
                className: 'form-text',
                text: text
            });
            this.appendChild(this.helpText);
        } else {
            this.helpText.setText(text);
        }
        return this;
    }
    
    setValue(value) {
        if (this.input.element.tagName === 'SELECT' || this.input.element.tagName === 'INPUT') {
            this.input.element.value = value;
        } else if (this.input.element.tagName === 'TEXTAREA') {
            this.input.element.value = value;
        }
        return this;
    }
    
    getValue() {
        return this.input.element.value;
    }
    
    setError(message) {
        this.input.addClass('is-invalid');
        
        if (!this.feedback) {
            this.feedback = new BaseComponent('div', {
                className: 'invalid-feedback'
            });
            this.appendChild(this.feedback);
        }
        
        this.feedback.setText(message);
        return this;
    }
    
    clearError() {
        this.input.removeClass('is-invalid');
        if (this.feedback) {
            this.feedback.remove();
            this.feedback = null;
        }
        return this;
    }
    
    validate() {
        this.clearError();
        
        // Базовая валидация required
        if (this.input.element.hasAttribute('required') && !this.getValue().trim()) {
            this.setError('Это поле обязательно для заполнения');
            return false;
        }
        
        return true;
    }
}
