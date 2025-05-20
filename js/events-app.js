// events-app.js
import eventController from './controllers/event-controller.js';
import tableController from './controllers/table-controller.js';

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
document.addEventListener('DOMContentLoaded', () => {
    // Установка текущей даты по умолчанию
    setCurrentDateAsDefault();
});

// Готово! Контроллеры уже инициализируются в своих файлах
console.log('События мафии инициализированы');
