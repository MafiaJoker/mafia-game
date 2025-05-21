// views/event-view.js
import localization from '../utils/localization.js';
import tableView from './table-view.js';
import eventModel, { EVENT_STATUSES, EVENT_CATEGORIES } from '../models/event-model.js';

export class EventView {
    constructor() {
        this.elements = {
            eventsList: document.getElementById('eventsList'),
            recentEvents: document.getElementById('recentEvents'),
            createEventForm: document.getElementById('createEventForm'),
            eventSearch: document.getElementById('eventSearch'),
            eventInfo: document.getElementById('eventInfo'),
            tablesContainer: document.getElementById('tablesContainer'),
            eventDetailsModalLabel: document.getElementById('eventDetailsModalLabel'),
            joinEventBtn: document.getElementById('joinEventBtn'),
            addTableBtn: document.getElementById('addTableBtn')
        };
    }

    // Отображение списка всех мероприятий
    renderEventsList(events) {
	if (!this.elements.eventsList && !this.elements.recentEvents) {
            console.log('Элементы DOM для списка мероприятий не найдены');
            return;
	}
	
	console.log('Отрисовка списка мероприятий, количество:', events.length);
	
	if (events.length === 0) {
            if (this.elements.eventsList) {
		this.elements.eventsList.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-calendar-x" style="font-size: 2rem;"></i>
                    <p class="mt-3">Нет доступных мероприятий</p>
                </div>
            `;
            }
            
            if (this.elements.recentEvents) {
		this.elements.recentEvents.innerHTML = `
                <div class="col-12 text-center py-4 text-muted">
                    <p>Нет недавних мероприятий</p>
                </div>
            `;
            }
            return;
	}
	
	// Очищаем списки если они существуют
	if (this.elements.eventsList) {
            this.elements.eventsList.innerHTML = '';
	}
	
	if (this.elements.recentEvents) {
            this.elements.recentEvents.innerHTML = '';
	}
	
	// Сортируем мероприятия по дате (от ближайших к отдаленным)
	const sortedEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
	
	// Заполняем список мероприятий
	sortedEvents.forEach(event => {
            if (this.elements.eventsList) {
		this.addEventToList(event);
            }
            
            // Создаем карточку для недавних мероприятий (только для 3-х ближайших)
            if (this.elements.recentEvents && this.elements.recentEvents.children.length < 3) {
		this.addEventToRecentCards(event);
            }
	});
    }

    // Добавление мероприятия в основной список
    addEventToList(event) {
	const languageDisplay = {
            'ru': '<span class="badge bg-secondary">RU</span>',
            'en': '<span class="badge bg-info">EN</span>',
            'am': '<span class="badge bg-primary">AM</span>'
	};

	// Определяем стиль для статуса мероприятия
	const statusStyle = {
            'planned': 'bg-secondary',
            'active': 'bg-success',
            'completed': 'bg-danger'
	};

	// Получаем названия статуса и категории
	const statusName = eventModel.getStatusName(event.status || 'planned');
	const categoryName = eventModel.getCategoryName(event.category || 'funky');
	
	const eventItem = document.createElement('a');
	eventItem.href = '#';
	eventItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
	eventItem.innerHTML = `
    <div>
        <h5 class="mb-1">
            ${event.name} ${languageDisplay[event.language] || ''}
            <span class="badge ${statusStyle[event.status || 'planned']}">${statusName}</span>
            <span class="badge bg-info">${categoryName}</span>
        </h5>
        <p class="mb-1 text-muted small">${event.description}</p>
    </div>
    <div class="text-end d-flex align-items-center">
        <div>
            <span class="badge bg-primary rounded-pill">${event.tables.length} ${this.getNounForm(event.tables.length, 'стол', 'стола', 'столов')}</span>
            <div class="small text-muted">${this.formatDate(event.date)}</div>
        </div>
    </div>
`;
	eventItem.dataset.eventId = event.id;
	this.elements.eventsList.appendChild(eventItem);
    }

    // Добавление мероприятия в карточки недавних мероприятий
    addEventToRecentCards(event) {
	const languageDisplay = {
            'ru': '<span class="badge bg-secondary">RU</span>',
            'en': '<span class="badge bg-info">EN</span>',
            'am': '<span class="badge bg-primary">AM</span>'
	};

	// Определяем стиль для статуса мероприятия
	const statusStyle = {
            'planned': 'bg-secondary',
            'active': 'bg-success',
            'completed': 'bg-danger'
	};

	// Получаем названия статуса и категории
	const statusName = eventModel.getStatusName(event.status || 'planned');
	const categoryName = eventModel.getCategoryName(event.category || 'funky');
	
        const eventCard = document.createElement('div');
        eventCard.className = 'col-md-4';
	eventCard.innerHTML = `
        <div class="card event-card h-100 shadow-sm">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <h5 class="card-title">${event.name} ${languageDisplay[event.language] || ''}</h5>
                    <span class="badge bg-dark">${this.formatDate(event.date)}</span>
                </div>
                <p class="card-text text-muted">${event.description}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="badge bg-light text-dark">
                        ${event.tables.length} ${this.getNounForm(event.tables.length, 'стол', 'стола', 'столов')}
                    </span>
                    <div>
                        <button class="btn btn-sm btn-outline-secondary view-event-btn" data-event-id="${event.id}">
                            <i class="bi bi-eye"></i> Детали
                        </button>
                        <button class="btn btn-sm btn-dark join-event-btn" data-event-id="${event.id}">
                            <i class="bi bi-box-arrow-in-right"></i> Войти
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
        this.elements.recentEvents.appendChild(eventCard);

	// Добавим кнопку удаления и кнопки изменения статуса
	const buttonsDiv = eventCard.querySelector('.card-body > div:last-child > div');
	if (buttonsDiv) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-outline-danger delete-event-btn me-1';
            deleteBtn.dataset.eventId = event.id;
            deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
            buttonsDiv.prepend(deleteBtn);
            
            // Добавляем кнопки изменения статуса, если мероприятие не завершено
            if (event.status !== 'completed') {
		// Кнопка установки статуса "Активно"
		if (event.status !== 'active') {
                    const activateBtn = document.createElement('button');
                    activateBtn.className = 'btn btn-sm btn-outline-success change-status-btn me-1';
                    activateBtn.dataset.eventId = event.id;
                    activateBtn.dataset.status = 'active';
                    activateBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
                    activateBtn.title = 'Активировать';
                    buttonsDiv.prepend(activateBtn);
		}
		
		// Кнопка установки статуса "Завершено"
		const completeBtn = document.createElement('button');
		completeBtn.className = 'btn btn-sm btn-outline-danger change-status-btn me-1';
		completeBtn.dataset.eventId = event.id;
		completeBtn.dataset.status = 'completed';
		completeBtn.innerHTML = '<i class="bi bi-check-circle"></i>';
		completeBtn.title = 'Завершить';
		buttonsDiv.prepend(completeBtn);
            }
	}
    }

    // Отображение деталей мероприятия
    renderEventDetails(event) {
	const languageLabels = {
            'ru': 'Русский',
            'en': 'English',
            'am': 'Հայերեն'
	};
	this.elements.eventDetailsModalLabel.textContent = event.name;
	this.elements.joinEventBtn.href = `event.html?id=${event.id}`;

	const existingDeleteBtn = this.elements.joinEventBtn.parentElement.querySelector('.delete-event-btn');
	if (existingDeleteBtn) {
	    existingDeleteBtn.remove();
	}
	
	const deleteBtn = document.createElement('button');
	deleteBtn.className = 'btn btn-danger delete-event-btn ms-2';
	deleteBtn.dataset.eventId = event.id;
	deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Удалить мероприятие';
	this.elements.joinEventBtn.parentElement.appendChild(deleteBtn);
	
	const statusName = eventModel.getStatusName(event.status || 'planned');
	const categoryName = eventModel.getCategoryName(event.category || 'funky');
	
	// Определяем стиль для статуса мероприятия
	const statusStyle = {
            'planned': 'bg-secondary',
            'active': 'bg-success',
            'completed': 'bg-danger'
	};
	
	// Отображаем информацию о мероприятии
	this.elements.eventInfo.innerHTML = `
        <div class="row mb-4">
            <div class="col-md-8">
                <div class="d-flex gap-2 mb-3">
                    <span class="badge ${statusStyle[event.status || 'planned']}">${statusName}</span>
                    <span class="badge bg-info">${categoryName}</span>
                </div>
                <h6 class="text-muted mb-3">Описание:</h6>
                <p>${event.description || 'Описание отсутствует'}</p>
            </div>
            <div class="col-md-4">
                <div class="card bg-light">
                    <div class="card-body">
                        <h6 class="card-title"><i class="bi bi-calendar-event"></i> Дата проведения</h6>
                        <p class="card-text">${this.formatDate(event.date)}</p>
                        <h6 class="card-title mt-3"><i class="bi bi-translate"></i> Язык</h6>
                        <p class="card-text">${languageLabels[event.language] || 'Русский'}</p>
                        <h6 class="card-title mt-3"><i class="bi bi-people"></i> Столы</h6>
                        <p class="card-text">${event.tables.length} ${this.getNounForm(event.tables.length, 'стол', 'стола', 'столов')}</p>
                    </div>
                </div>
            </div>
        </div>
        <hr>
    `;
	
	// Кнопки управления статусом в модальном окне
	const statusControlsContainer = document.createElement('div');
	statusControlsContainer.className = 'mb-3 d-flex gap-2';
	statusControlsContainer.innerHTML = `<h6 class="mb-0 me-2 align-self-center">Статус мероприятия:</h6>`;
	
	// Создаем кнопки для изменения статуса
	Object.entries(EVENT_STATUSES).forEach(([key, value]) => {
            const statusBtn = document.createElement('button');
            statusBtn.className = `btn btn-sm ${event.status === value ? 'btn-primary' : 'btn-outline-secondary'} change-status-btn`;
            statusBtn.textContent = eventModel.getStatusName(value);
            statusBtn.dataset.eventId = event.id;
            statusBtn.dataset.status = value;
                        
            statusControlsContainer.appendChild(statusBtn);
	});
	
	// Добавляем кнопки управления статусом перед списком столов
	this.elements.eventInfo.appendChild(statusControlsContainer);
	
	// Если мероприятие завершено, скрываем кнопку добавления стола
	if (event.status === 'completed') {
            this.elements.addTableBtn.style.display = 'none';
	} else {
            this.elements.addTableBtn.style.display = 'block';
	}
	
	// Отображаем столы мероприятия
	tableView.renderTables(event);
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

    // Форматирование даты
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit', 
            month: 'long', 
            year: 'numeric'
        });
    }
}

export default new EventView();
