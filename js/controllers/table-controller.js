// controllers/table-controller.js
import eventModel from '../models/event-model.js';
import tableView from '../views/table-view.js';
import eventView from '../views/event-view.js';
import toastManager from '../utils/toast-manager.js';

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
		const deleteBtn = e.target.closest('.delete-table-btn');
		
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
		} else if (deleteBtn) {
                    const eventId = parseInt(deleteBtn.dataset.eventId);
                    const tableId = parseInt(deleteBtn.dataset.tableId);
                    this.deleteTable(eventId, tableId);
                    e.stopPropagation();
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
    async openTableModal(eventId, table = null) {
	// Проверяем статус мероприятия
	const event = eventModel.getEventById(eventId);
	if (event && event.status === 'completed') {
            toastManager.error('Невозможно добавить стол к завершенному мероприятию');
            return;
	}
	
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
        await tableView.setupTableModal(!!table, table, placeholder);
        
        // Открываем модальное окно
        const tableModal = document.getElementById('tableModal');
        if (tableModal) {
            const modal = new bootstrap.Modal(tableModal);
            modal.show();
        }
    }

    // Сохранить стол
    async saveTable() {
	const saveTableBtn = document.getElementById('saveTable');
	if (!saveTableBtn) return;
	
	const eventId = parseInt(saveTableBtn.dataset.eventId);
	const tableId = saveTableBtn.hasAttribute('data-table-id') ? parseInt(saveTableBtn.dataset.tableId) : null;

	// Проверяем статус мероприятия
	const event = eventModel.getEventById(eventId);
	if (event && event.status === 'completed') {
            toastManager.error('Невозможно добавить стол к завершенному мероприятию');
            return;
	}
	
	// Получаем данные формы
	const tableData = tableView.getTableFormData();
	
	// Если имя не указано, автоматически генерируем его
	if (!tableData.name) {
            const nextNumber = event.tables.length + 1;
            tableData.name = `Стол ${nextNumber}`;
	}
	
	try {
            if (tableId) {
		// Обновляем существующий стол
		await eventModel.updateTable(eventId, tableId, tableData);
            } else {
		// Создаем новый стол
		await eventModel.addTableToEvent(eventId, tableData);
            }
            
            // Закрываем модальное окно
            const tableModal = document.getElementById('tableModal');
            if (tableModal) {
		const modal = bootstrap.Modal.getInstance(tableModal);
		if (modal) modal.hide();
            }

            // Обновляем интерфейс ПОСЛЕ успешного добавления/изменения стола
            const updatedEvent = eventModel.getEventById(eventId);
            if (updatedEvent) {
		eventView.renderEventDetails(updatedEvent);
            }
	} catch (error) {
            console.error('Ошибка при сохранении стола:', error);
            toastManager.error('Произошла ошибка при сохранении стола.');
	}
    }
    
    async deleteTable(eventId, tableId) {
	if (confirm('Вы уверены, что хотите удалить этот стол?')) {
            try {
		const result = await eventModel.deleteTableFromEvent(eventId, tableId);
		if (result) {
                    console.log('Стол успешно удален');
                    
                    // Обновляем интерфейс ПОСЛЕ успешного удаления стола
                    const updatedEvent = eventModel.getEventById(eventId);
                    if (updatedEvent) {
			eventView.renderEventDetails(updatedEvent);
                    }
		} else {
                    toastManager.error('Не удалось удалить стол. Проверьте подключение к серверу.');
		}
            } catch (error) {
		console.error('Ошибка удаления стола:', error);
		toastManager.errot('Произошла ошибка при удалении стола.');
            }
	}
    }
}

export default new TableController();
