// js/events-app.js
import eventController from './controllers/event-controller.js';
import tableController from './controllers/table-controller.js';
import eventModel from './models/event-model.js';
import eventView from './views/event-view.js';
import apiAdapter from './adapter.js';

// Делаем адаптер доступным глобально
window.apiAdapter = apiAdapter;

// Функция для установки текущей даты по умолчанию
function setCurrentDateAsDefault() {
    const eventDateField = document.getElementById('eventDate');
    if (eventDateField) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
        const day = String(today.getDate()).padStart(2, '0');
        eventDateField.value = `${year}-${month}-${day}`;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    // Установка текущей даты по умолчанию
    setCurrentDateAsDefault();

    // Сначала убедимся, что контроллер инициализирован
    console.log('Инициализация контроллера:', eventController);
    
    // Явно загружаем данные и обновляем интерфейс
    await eventModel.loadEvents();
    eventView.renderEventsList(eventModel.events);
});

console.log('События мафии инициализированы');
