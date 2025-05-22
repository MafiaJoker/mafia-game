// js/views/view-utils.js
import { BaseComponent, Button, Card, Badge } from '../components/index.js';

export class ViewUtils {
    // Создание группы кнопок действий
    static createActionButtonGroup(buttons) {
        const container = new BaseComponent('div', {
            className: 'd-flex flex-wrap gap-2'
        });

        buttons.forEach(btnConfig => {
            const button = new Button({
                text: btnConfig.text,
                variant: btnConfig.variant || 'primary',
                size: btnConfig.size,
                className: btnConfig.className
            });

            if (btnConfig.onClick) {
                button.onClick(btnConfig.onClick);
            }

            if (btnConfig.disabled) {
                button.setDisabled(true);
            }

            container.appendChild(button);
        });

        return container;
    }

    // Создание информационной панели
    static createInfoPanel(title, items) {
        const card = new Card({
            className: 'mb-3'
        }).setHeader(title);

        const list = new BaseComponent('ul', {
            className: 'list-group list-group-flush'
        });

        items.forEach(item => {
            const listItem = new BaseComponent('li', {
                className: 'list-group-item d-flex justify-content-between align-items-center'
            });

            const text = new BaseComponent('span', { text: item.label });
            const badge = new Badge(item.value, { variant: item.variant || 'primary' });

            listItem.appendChild(text);
            listItem.appendChild(badge);
            list.appendChild(listItem);
        });

        card.setBody(list);
        return card;
    }

    // Создание счетчика
    static createCounter(label, value, variant = 'primary') {
        const container = new BaseComponent('div', {
            className: 'd-flex align-items-center gap-2'
        });

        const labelElement = new BaseComponent('span', {
            text: label,
            className: 'fw-bold'
        });

        const badge = new Badge(value.toString(), { variant: variant });

        container.appendChild(labelElement);
        container.appendChild(badge);

        return container;
    }

    // Создание прогресс-бара
    static createProgressBar(value, max, label = '') {
        const percentage = Math.round((value / max) * 100);
        
        const container = new BaseComponent('div', { className: 'mb-2' });
        
        if (label) {
            const labelElement = new BaseComponent('div', {
                className: 'd-flex justify-content-between mb-1'
            });
            
            labelElement.appendChild(new BaseComponent('span', { text: label }));
            labelElement.appendChild(new BaseComponent('span', { text: `${value}/${max}` }));
            
            container.appendChild(labelElement);
        }

        const progressWrapper = new BaseComponent('div', {
            className: 'progress'
        });

        const progressBar = new BaseComponent('div', {
            className: 'progress-bar',
            attributes: {
                style: `width: ${percentage}%`,
                'aria-valuenow': value,
                'aria-valuemin': '0',
                'aria-valuemax': max
            }
        });

        progressWrapper.appendChild(progressBar);
        container.appendChild(progressWrapper);

        return container;
    }

    // Создание таблицы
    static createTable(headers, rows, className = '') {
        const table = new BaseComponent('table', {
            className: `table ${className}`
        });

        // Заголовки
        const thead = new BaseComponent('thead');
        const headerRow = new BaseComponent('tr');

        headers.forEach(header => {
            const th = new BaseComponent('th', { text: header });
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Строки данных
        const tbody = new BaseComponent('tbody');

        rows.forEach(rowData => {
            const row = new BaseComponent('tr');

            rowData.forEach(cellData => {
                const td = new BaseComponent('td');
                
                if (typeof cellData === 'string') {
                    td.setText(cellData);
                } else if (cellData instanceof BaseComponent) {
                    td.appendChild(cellData);
                } else {
                    td.setHtml(cellData.toString());
                }

                row.appendChild(td);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        return table;
    }
}

export default ViewUtils;
