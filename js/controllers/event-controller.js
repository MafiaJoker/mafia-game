// controllers/event-controller.js
import eventModel from '../models/event-model.js';
import eventView from '../views/event-view.js';
import tableController from './table-controller.js';

export class EventController {
    constructor() {
	// Сначала подписываемся на события модели, потом инициализируем UI
	this.initEventListeners();
        this.setupEventListeners();
    }

    initEventListeners() {
	// Подписываемся на события модели
	eventModel.on('eventsLoaded', (events) => {
            console.log('Получено событие eventsLoaded, количество мероприятий:', events.length);
            eventView.renderEventsList(events);
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
		    language: document.getElementById('eventLanguage').value // Добавляем язык
                };
                
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
        
        // Обработчик поиска мероприятий
        const eventSearch = document.getElementById('eventSearch');
        if (eventSearch) {
            eventSearch.addEventListener('input', (e) => {
                const searchTerm = e.target.value;
                const filteredEvents = eventModel.searchEvents(searchTerm);
                eventView.renderEventsList(filteredEvents);
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
