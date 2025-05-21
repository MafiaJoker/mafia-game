// controllers/event-controller.js
import eventModel from '../models/event-model.js';
import eventView from '../views/event-view.js';
import tableController from './table-controller.js';

export class EventController {
    constructor() {
	// Сначала подписываемся на события модели, потом инициализируем UI
	this.initEventListeners();
        this.setupEventListeners();
	
	// Привязываем методы к контексту класса
        this.changeEventStatus = this.changeEventStatus.bind(this);
    }

    initEventListeners() {
	// Подписываемся на события модели
	eventModel.on('eventsLoaded', (events) => {
            console.log('Получено событие eventsLoaded, количество мероприятий:', events.length);
            eventView.renderEventsList(events);
	});

	eventModel.on('tableDeleted', ({ event }) => {
	    eventView.renderEventDetails(event);
	});
	
	eventModel.on('eventCreated', (event) => {
            eventView.renderEventsList(eventModel.events);
            this.showEventDetails(event);
	});
	
	eventModel.on('tableAdded', ({ event }) => {
            eventView.renderEventDetails(event);
	});
	
	eventModel.on('tableUpdated', ({ event }) => {
            eventView.renderEventDetails(event);
	});
    }
    
    setupEventListeners() {
        // Обработчик создания нового мероприятия
        const createEventForm = document.getElementById('createEventForm');
        if (createEventForm) {
            createEventForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const eventData = {
                    name: document.getElementById('eventName').value,
                    description: document.getElementById('eventDescription').value,
                    date: document.getElementById('eventDate').value,
		    language: document.getElementById('eventLanguage').value,
		    category: document.getElementById('eventCategory').value,
                    status: document.getElementById('eventStatus').value
                };

		// Получаем выбранного ведущего из формы
		const judgeSelector = document.getElementById('judgeSelector');
		if (judgeSelector && judgeSelector.value) {
		    eventData.judgeId = parseInt(judgeSelector.value);
		} 
		// Если ведущий не выбран в форме, используем ведущего из шапки
		else {
		    const defaultJudgeId = localStorage.getItem('defaultJudgeId');
		    if (defaultJudgeId) {
			eventData.judgeId = parseInt(defaultJudgeId);
		    }
		}
		
		const newEvent = await eventModel.createEvent(eventData);
		
		if (newEvent) {
                    // Принудительно обновляем список мероприятий
                    eventView.renderEventsList(eventModel.events);
                    
                    // Показываем уведомление
                    alert('Мероприятие успешно создано!');
                    
                    // Сбрасываем форму
                    createEventForm.reset();
                    setCurrentDateAsDefault(); // Необходимо определить эту функцию
		}
            });
        }

	const archivedEvents = document.getElementById('archivedEvents');
	if (archivedEvents) {
	    archivedEvents.addEventListener('click', (e) => {
		const viewBtn = e.target.closest('.view-event-btn');
		const deleteBtn = e.target.closest('.delete-event-btn');
		
		if (viewBtn) {
		    const eventId = parseInt(viewBtn.dataset.eventId);
		    const event = eventModel.getEventById(eventId);
		    if (event) {
			this.showEventDetails(event);
		    }
		} else if (deleteBtn) {
		    const eventId = parseInt(deleteBtn.dataset.eventId);
		    this.deleteEvent(eventId);
		    e.stopPropagation();
		}
	    });
	}
	
	// Делегирование событий для кнопок изменения статуса
	document.addEventListener('click', (e) => {
            const changeStatusBtn = e.target.closest('.change-status-btn');
            if (changeStatusBtn) {
		e.preventDefault();
		e.stopPropagation();
		
		const eventId = parseInt(changeStatusBtn.dataset.eventId);
		const newStatus = changeStatusBtn.dataset.status;
		
		this.changeEventStatus(eventId, newStatus);
            }
	});
        
        // Обработчик поиска мероприятий
	const eventSearch = document.getElementById('eventSearch');
	if (eventSearch) {
	    eventSearch.addEventListener('input', (e) => {
		const searchTerm = e.target.value;
		const activeEvents = eventModel.getActiveEvents(searchTerm);
		const archivedEvents = eventModel.getArchivedEvents(searchTerm);
		
		// Обновляем списки с учетом поиска
		if (this.elements && this.elements.eventsList) {
		    this.elements.eventsList.innerHTML = '';
		    activeEvents.forEach(event => this.addEventToList(event));
		}
		
		if (this.elements && this.elements.archivedEvents) {
		    this.elements.archivedEvents.innerHTML = '';
		    archivedEvents.forEach(event => this.addEventToArchivedList(event));
		}
	    });
	}        
        // Делегирование событий для списка мероприятий
        const eventsList = document.getElementById('eventsList');
        if (eventsList) {
            eventsList.addEventListener('click', (e) => {
                e.preventDefault();
                const eventItem = e.target.closest('[data-event-id]');
                if (eventItem) {
                    const eventId = parseInt(eventItem.dataset.eventId);
                    const event = eventModel.getEventById(eventId);
                    if (event) {
                        this.showEventDetails(event);
                    }
                }
            });
        }
        
        // Обработчики для списка недавних мероприятий
        const recentEvents = document.getElementById('recentEvents');
        if (recentEvents) {
            recentEvents.addEventListener('click', (e) => {
                const viewBtn = e.target.closest('.view-event-btn');
                const joinBtn = e.target.closest('.join-event-btn');
                
                if (viewBtn) {
                    const eventId = parseInt(viewBtn.dataset.eventId);
                    const event = eventModel.getEventById(eventId);
                    if (event) {
                        this.showEventDetails(event);
                    }
                } else if (joinBtn) {
                    const eventId = parseInt(joinBtn.dataset.eventId);
                    window.location.href = `event.html?id=${eventId}`;
                }
            });
        }
	
	// Делегирование событий для кнопок удаления мероприятий
	document.addEventListener('click', (e) => {
	    const deleteBtn = e.target.closest('.delete-event-btn');
	    if (deleteBtn) {
		// Важно предотвратить всплытие события (bubbling)
		e.preventDefault();
		e.stopPropagation();
		
		// Предотвращаем дальнейшую обработку события кликом
		if (e.stopImmediatePropagation) {
		    e.stopImmediatePropagation();
		}
		
		const eventId = parseInt(deleteBtn.dataset.eventId);
		this.deleteEvent(eventId);
		return false; // Ещё один способ прервать обработку события
	    }
	});
	
        // Обработчик для добавления нового стола
        const addTableBtn = document.getElementById('addTableBtn');
        if (addTableBtn) {
            addTableBtn.addEventListener('click', (e) => {
                const eventId = parseInt(addTableBtn.dataset.eventId);
                tableController.openTableModal(eventId);
            });
        }
    }

    // Показать детали мероприятия
    showEventDetails(event) {
        eventView.renderEventDetails(event);
        
        // Устанавливаем id мероприятия для кнопки добавления стола
        const addTableBtn = document.getElementById('addTableBtn');
        if (addTableBtn) {
            addTableBtn.dataset.eventId = event.id;
        }
        
        // Открываем модальное окно
        const eventDetailsModal = document.getElementById('eventDetailsModal');
        if (eventDetailsModal) {
            const modal = new bootstrap.Modal(eventDetailsModal);
            modal.show();
        }
    }

    // Новый метод для изменения статуса мероприятия
    async changeEventStatus(eventId, newStatus) {
	const event = eventModel.getEventById(eventId);
	if (!event) return;
	
	// Запрашиваем подтверждение при завершении мероприятия
	if (newStatus === 'completed' && !confirm('Вы уверены, что хотите завершить мероприятие? После завершения нельзя будет добавлять столы и игры.')) {
            return;
	}
	
	const success = await eventModel.updateEventStatus(eventId, newStatus);
	
	if (success) {
            // Обновляем UI
            eventView.renderEventsList(eventModel.events);
            
            // Если открыто модальное окно с деталями мероприятия, обновляем и его
            const eventDetailsModal = document.getElementById('eventDetailsModal');
            const isModalVisible = eventDetailsModal && eventDetailsModal.classList.contains('show');
            
            if (isModalVisible) {
		const updatedEvent = eventModel.getEventById(eventId);
		eventView.renderEventDetails(updatedEvent);
            }
            
            // Показываем сообщение об успешном изменении статуса
            alert(`Статус мероприятия изменен на "${eventModel.getStatusName(newStatus)}"`);
	} else {
            alert('Ошибка изменения статуса мероприятия');
	}
    }
    
    async deleteEvent(eventId) {
	if (confirm('Вы уверены, что хотите удалить это мероприятие?')) {
            const success = await eventModel.deleteEvent(eventId);
            if (success) {
		// Закрываем модальное окно с деталями мероприятия
		const eventDetailsModal = document.getElementById('eventDetailsModal');
		if (eventDetailsModal) {
                    // Правильное получение и закрытие модального окна через Bootstrap API
                    const modalInstance = bootstrap.Modal.getInstance(eventDetailsModal);
                    if (modalInstance) {
			modalInstance.hide();
                    } else {
			// Альтернативный способ закрытия, если экземпляр модального окна не найден
			eventDetailsModal.classList.remove('show');
			eventDetailsModal.style.display = 'none';
			
			// Удаляем модальный backdrop если он существует
			const backdrop = document.querySelector('.modal-backdrop');
			if (backdrop) {
                            backdrop.remove();
			}
			
			// Убираем класс modal-open с body
			document.body.classList.remove('modal-open');
			document.body.style.overflow = '';
			document.body.style.paddingRight = '';
                    }
		}
		
		// Обновляем список мероприятий
		eventView.renderEventsList(eventModel.events);
		
		// Показываем уведомление
		alert('Мероприятие успешно удалено!');
            } else {
		alert('Не удалось удалить мероприятие. Проверьте, что API-сервер запущен.');
            }
	}
    }
}

export default new EventController();
