// views/table-view.js
import localization from '../utils/localization.js';

export class TableView {
    constructor() {
        this.elements = {
            tablesContainer: document.getElementById('tablesContainer'),
            tableForm: document.getElementById('tableForm'),
            tableModalLabel: document.getElementById('tableModalLabel'),
            tableName: document.getElementById('tableName'),
            tableCapacity: document.getElementById('tableCapacity'),
	    tableJudge: document.getElementById('tableJudge'),
            freeSeating: document.getElementById('freeSeating'),
            fixedSeating: document.getElementById('fixedSeating'),
            saveTableBtn: document.getElementById('saveTable')
        };
    }

    // Отображение списка столов
    renderTables(event) {
        if (!this.elements.tablesContainer) return;
        
        this.elements.tablesContainer.innerHTML = '';
        
        if (event.tables.length === 0) {
            this.elements.tablesContainer.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <p>У этого мероприятия еще нет столов</p>
                </div>
            `;
            return;
        }
        
        event.tables.forEach(table => {
            this.addTableToContainer(event, table);
        });
    }

    // Добавление стола в контейнер
    addTableToContainer(event, table) {
	const tableItem = document.createElement('div');
	tableItem.className = 'table-card';
	tableItem.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <h5 class="mb-0">${table.name}</h5>
            <div>
                <span class="seating-type ${table.seatingType}">
                    ${table.seatingType === 'free' ? 'Свободная рассадка' : 'Заданная рассадка'}
                </span>
            </div>
        </div>
        <div class="mt-2">
            ${table.judge ? `<span class="badge bg-info">Судья: ${table.judge}</span>` : ''}
        </div>
        <div class="d-flex justify-content-between align-items-center mt-3">
            <span class="text-muted">
                ${table.games && table.games.length > 0 
                    ? `${table.games.length} ${this.getNounForm(table.games.length, 'игра', 'игры', 'игр')}` 
                    : 'Нет игр'}
            </span>
            <div>
                <button class="btn btn-sm btn-outline-secondary edit-table-btn" data-event-id="${event.id}" data-table-id="${table.id}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-primary open-table-btn" data-event-id="${event.id}" data-table-id="${table.id}">
                    <i class="bi bi-box-arrow-in-right"></i> Открыть
                </button>
            </div>
        </div>
    `;
	this.elements.tablesContainer.appendChild(tableItem);
    }

    // Настройка модального окна для создания/редактирования стола
    setupTableModal(isEditing, table = null, placeholder='') {
	if (isEditing) {
            this.elements.tableModalLabel.textContent = 'Редактировать стол';
            this.elements.tableName.value = table.name;
            this.elements.tableCapacity.value = table.capacity;
            this.elements.tableJudge.value = table.judge || ''; // Устанавливаем значение судьи
            
            if (table.seatingType === 'free') {
		this.elements.freeSeating.checked = true;
            } else {
		this.elements.fixedSeating.checked = true;
            }
	} else {
            this.elements.tableModalLabel.textContent = 'Новый стол';
            this.elements.tableForm.reset();
            if (placeholder) {
		this.elements.tableName.value = placeholder;
            }
	}
    }

    // Получение данных формы стола
    getTableFormData() {
	return {
            name: this.elements.tableName.value,
            capacity: parseInt(this.elements.tableCapacity.value),
            seatingType: document.querySelector('input[name="seatingType"]:checked').value,
            judge: this.elements.tableJudge.value // Добавляем судью в возвращаемые данные
	};
    }

    // Склонение существительных
    getNounForm(number, one, two, five) {
        let n = Math.abs(number);
        n %= 100;
        if (n >= 5 && n <= 20) {
            return five;
        }
        n %= 10;
        if (n === 1) {
            return one;
        }
        if (n >= 2 && n <= 4) {
            return two;
        }
        return five;
    }
}

export default new TableView();
