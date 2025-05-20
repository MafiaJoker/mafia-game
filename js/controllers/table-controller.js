// controllers/table-controller.js
import eventModel from '../models/event-model.js';
import tableView from '../views/table-view.js';

export class TableController {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Делегирование событий для списка столов
        const tablesContainer = document.getElementById('tablesContainer');
        if (tablesContainer) {
            tablesContainer.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-table-btn');
                const openBtn = e.target.closest('.open-table-btn');
                
                if (editBtn) {
                    const eventId = parseInt(editBtn.dataset.eventId);
                    const tableId = parseInt(editBtn.dataset.tableId);
                    const event = eventModel.getEventById(eventId);
                    const table = event?.tables.find(t => t.id === tableId);
                    
                    if (event && table) {
                        this.openTableModal(eventId, table);
                    }
                } else if (openBtn) {
                    const eventId = parseInt(openBtn.dataset.eventId);
                    const tableId = parseInt(openBtn.dataset.tableId);
                    window.location.href = `game.html?eventId=${eventId}&tableId=${tableId}`;
                }
            });
        }
        
        // Обработчик сохранения стола
        const saveTableBtn = document.getElementById('saveTable');
        if (saveTableBtn) {
            saveTableBtn.addEventListener('click', () => {
                this.saveTable();
            });
        }
    }

    // Открыть модальное окно для создания/редактирования стола
    openTableModal(eventId, table = null) {
        // Сохраняем id мероприятия и стола для последующего сохранения
        const saveTableBtn = document.getElementById('saveTable');
        if (saveTableBtn) {
            saveTableBtn.dataset.eventId = eventId;
            if (table) {
                saveTableBtn.dataset.tableId = table.id;
            } else {
                saveTableBtn.removeAttribute('data-table-id');
            }
        }

	// Определяем следующий номер стола
        let placeholder = '';
        if (!table) {
            const event = eventModel.getEventById(eventId);
            if (event) {
                const nextNumber = event.tables.length + 1;
                placeholder = `Стол ${nextNumber}`;
            }
        }
        
        // Настраиваем модальное окно
        tableView.setupTableModal(!!table, table, placeholder);
        
        // Открываем модальное окно
        const tableModal = document.getElementById('tableModal');
        if (tableModal) {
            const modal = new bootstrap.Modal(tableModal);
            modal.show();
        }
    }

    // Сохранить стол
    saveTable() {
	const saveTableBtn = document.getElementById('saveTable');
	if (!saveTableBtn) return;
	
	const eventId = parseInt(saveTableBtn.dataset.eventId);
	const tableId = saveTableBtn.hasAttribute('data-table-id') ? parseInt(saveTableBtn.dataset.tableId) : null;
	
	// Получаем данные формы
	const tableData = tableView.getTableFormData();
	
	// Получаем событие для определения следующего номера стола
	const event = eventModel.getEventById(eventId);
	if (!event) return;
	
	// Если имя не указано, автоматически генерируем его
	if (!tableData.name) {
            const nextNumber = event.tables.length + 1;
            tableData.name = `Стол ${nextNumber}`;
	}
	
	if (tableId) {
            // Обновляем существующий стол
            eventModel.updateTable(eventId, tableId, tableData);
	} else {
            // Создаем новый стол
            eventModel.addTableToEvent(eventId, tableData);
	}
	
	// Закрываем модальное окно
	const tableModal = document.getElementById('tableModal');
	if (tableModal) {
            const modal = bootstrap.Modal.getInstance(tableModal);
            if (modal) modal.hide();
	}
    }
}

export default new TableController();
